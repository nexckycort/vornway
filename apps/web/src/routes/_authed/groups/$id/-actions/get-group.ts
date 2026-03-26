/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { parseExpenseMetadata } from '~/lib/expense-metadata';
import { useAppSession } from '~/utils/session';

const GetGroupInputSchema = z.object({
  groupId: z.string(),
});

interface Expense {
  id: string;
  category: {
    id: string;
    name: string;
  } | null;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  isDeleted: boolean;
  isSettlement: boolean;
  isPersonal: boolean;
  isPinned: boolean;
  pinnedAt: string | null;
  expenseType: 'standard' | 'composite';
  subExpenseCount: number;
  settlementToName: string | null;
  paidBy: {
    id: string;
    name: string;
  };
  participantCount: number;
  currentUserBalance: number | null; // positivo = te deben, negativo = debes, null = no involucrado
}

interface Member {
  id: string;
  name: string;
  role: string;
  userId: string | null;
  isCurrentUser: boolean;
}

interface MemberBalance {
  memberId: string;
  name: string;
  isCurrentUser: boolean;
  balances: Record<string, number>; // { "COP": -50000, "USD": 10 } positivo = le deben, negativo = debe
}

interface DirectDebt {
  toMemberId: string;
  toName: string;
  currency: string;
  amount: number;
}

interface DirectCredit {
  fromMemberId: string;
  fromName: string;
  currency: string;
  amount: number;
}

interface SettlementDebt {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  currency: string;
  amount: number;
}

interface GetGroupResponse {
  name: string;
  participantCount: number;
  totals: Record<string, number>; // { "COP": 150000, "USD": 50 }
  expenses: Expense[];
  inviteCode: string | null;
  members: Member[];
  memberBalances: MemberBalance[];
  directDebts: DirectDebt[];
  directCredits: DirectCredit[];
  settlementDebts: SettlementDebt[];
  isOwner: boolean;
}

export const getGroup = createServerFn({ method: 'POST' })
  .inputValidator(GetGroupInputSchema)
  .handler(async ({ data }): Promise<GetGroupResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        throw new Error('No autenticado');
      }

      const groupRecord = await db.group.findUnique({
        select: {
          name: true,
          totals: true,
          inviteCode: true,
          ownerId: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              role: true,
              userId: true,
            },
            orderBy: { joinedAt: 'asc' },
          },
          Expense: {
            select: {
              id: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              description: true,
              amount: true,
              currency: true,
              date: true,
              notes: true,
              metadata: true,
              paidBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
              participants: {
                select: {
                  memberId: true,
                  share: true,
                  member: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  participants: true,
                },
              },
            },
            orderBy: { date: 'desc' },
          },
        },
        where: { id: data.groupId },
      });

      if (!groupRecord) {
        throw new Error('Grupo no encontrado');
      }

      // Verificar que el usuario es miembro del grupo
      const isMember = groupRecord.GroupMember.some(
        (member) => member.userId === userId,
      );

      if (!isMember) {
        throw new Error('No tienes acceso a este grupo');
      }

      // Encontrar el memberId del usuario actual
      const currentMember = groupRecord.GroupMember.find(
        (member) => member.userId === userId,
      );
      const currentMemberId = currentMember?.id;

      const expenses: Expense[] = groupRecord.Expense.map((expense) => {
        const isDeleted = expense.notes?.includes('[DELETED]') ?? false;
        const isSettlement = expense.notes?.includes('[SETTLEMENT') ?? false;
        const isPersonal = !isSettlement && expense.participants.length === 0;
        const metadata = parseExpenseMetadata(expense.metadata);
        const expenseType: Expense['expenseType'] = metadata.expenseType;
        const settlementToName = isSettlement
          ? (expense.participants[0]?.member.name ?? null)
          : null;
        let currentUserBalance: number | null = null;

        if (!isDeleted && !isPersonal && currentMemberId) {
          const isPayer = expense.paidBy.id === currentMemberId;
          const participation = expense.participants.find(
            (p) => p.memberId === currentMemberId,
          );

          if (isPayer || participation) {
            currentUserBalance = 0;
            if (isPayer) {
              currentUserBalance += expense.amount;
            }
            if (participation) {
              currentUserBalance -= participation.share;
            }
          }
        }

        return {
          id: expense.id,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          date: expense.date,
          isDeleted,
          isSettlement,
          isPersonal,
          isPinned: Boolean(metadata.pinnedAt),
          pinnedAt: metadata.pinnedAt,
          expenseType,
          subExpenseCount: metadata.items.length,
          settlementToName,
          paidBy: {
            id: expense.paidBy.id,
            name: expense.paidBy.name,
          },
          participantCount: expense._count.participants,
          currentUserBalance,
        };
      })
        .filter((expense) => !(expense.isSettlement && expense.isDeleted))
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
          }

          if (a.isPinned && b.isPinned) {
            return (
              new Date(b.pinnedAt ?? 0).getTime() -
              new Date(a.pinnedAt ?? 0).getTime()
            );
          }

          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

      const members: Member[] = groupRecord.GroupMember.map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        userId: member.userId,
        isCurrentUser: member.userId === userId,
      }));

      // Calcular balances por miembro y moneda
      // Positivo = le deben (pagó más de lo que le corresponde)
      // Negativo = debe (le corresponde pagar más de lo que pagó)
      const balanceMap = new Map<string, Record<string, number>>();

      for (const member of groupRecord.GroupMember) {
        balanceMap.set(member.id, {});
      }

      for (const expense of groupRecord.Expense) {
        const isDeleted = expense.notes?.includes('[DELETED]') ?? false;
        if (isDeleted) continue;
        if (expense.participants.length === 0) continue;

        const currency = expense.currency;
        const payerId = expense.paidBy.id;

        // El pagador recibe crédito por el monto total
        const payerBalances = balanceMap.get(payerId);
        if (payerBalances) {
          payerBalances[currency] =
            (payerBalances[currency] ?? 0) + expense.amount;
        }

        // Cada participante debe su parte
        for (const participant of expense.participants) {
          const memberBalances = balanceMap.get(participant.memberId);
          if (memberBalances) {
            memberBalances[currency] =
              (memberBalances[currency] ?? 0) - participant.share;
          }
        }
      }

      const memberBalances: MemberBalance[] = groupRecord.GroupMember.map(
        (member) => ({
          memberId: member.id,
          name: member.name,
          isCurrentUser: member.userId === userId,
          balances: balanceMap.get(member.id) ?? {},
        }),
      );

      const directDebtByPair = new Map<string, number>();
      const allDebtByPair = new Map<string, number>();
      if (currentMemberId) {
        for (const expense of groupRecord.Expense) {
          const isDeleted = expense.notes?.includes('[DELETED]') ?? false;
          if (isDeleted) continue;
          if (expense.participants.length === 0) continue;

          if (expense.paidBy.id === currentMemberId) {
            for (const participant of expense.participants) {
              if (participant.memberId === currentMemberId) continue;
              const key = `${participant.memberId}:${expense.currency}`;
              directDebtByPair.set(
                key,
                (directDebtByPair.get(key) ?? 0) - participant.share,
              );
            }
            continue;
          }

          const currentParticipation = expense.participants.find(
            (participant) => participant.memberId === currentMemberId,
          );
          if (!currentParticipation) continue;

          const key = `${expense.paidBy.id}:${expense.currency}`;
          directDebtByPair.set(
            key,
            (directDebtByPair.get(key) ?? 0) + currentParticipation.share,
          );
        }
      }

      for (const expense of groupRecord.Expense) {
        const isDeleted = expense.notes?.includes('[DELETED]') ?? false;
        if (isDeleted) continue;
        if (expense.participants.length === 0) continue;

        for (const participant of expense.participants) {
          if (participant.memberId === expense.paidBy.id) continue;

          const key = `${participant.memberId}:${expense.paidBy.id}:${expense.currency}`;
          allDebtByPair.set(
            key,
            (allDebtByPair.get(key) ?? 0) + participant.share,
          );
        }
      }

      const memberNameById = new Map(
        groupRecord.GroupMember.map((member) => [member.id, member.name]),
      );

      const directDebts: DirectDebt[] = Array.from(directDebtByPair.entries())
        .map(([pairKey, amount]) => {
          const [toMemberId, currency] = pairKey.split(':');
          return {
            toMemberId,
            toName: memberNameById.get(toMemberId) ?? 'Miembro',
            currency,
            amount,
          };
        })
        .filter((entry) => entry.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      const directCredits: DirectCredit[] = Array.from(
        directDebtByPair.entries(),
      )
        .map(([pairKey, amount]) => {
          const [fromMemberId, currency] = pairKey.split(':');
          return {
            fromMemberId,
            fromName: memberNameById.get(fromMemberId) ?? 'Miembro',
            currency,
            amount: Math.abs(amount),
          };
        })
        .filter((entry) => entry.amount > 0)
        .filter((entry) => {
          const key = `${entry.fromMemberId}:${entry.currency}`;
          return (directDebtByPair.get(key) ?? 0) < 0;
        })
        .sort((a, b) => b.amount - a.amount);

      const settlementPairMap = new Map<string, SettlementDebt>();

      for (const [pairKey, amount] of allDebtByPair.entries()) {
        if (amount <= 0) continue;

        const [fromMemberId, toMemberId, currency] = pairKey.split(':');
        const reverseKey = `${toMemberId}:${fromMemberId}:${currency}`;
        const reverseAmount = allDebtByPair.get(reverseKey) ?? 0;
        const netAmount = amount - reverseAmount;

        if (netAmount <= 0) continue;

        settlementPairMap.set(pairKey, {
          fromMemberId,
          fromName: memberNameById.get(fromMemberId) ?? 'Miembro',
          toMemberId,
          toName: memberNameById.get(toMemberId) ?? 'Miembro',
          currency,
          amount: netAmount,
        });
      }

      const settlementDebts = Array.from(settlementPairMap.values()).sort(
        (a, b) => b.amount - a.amount,
      );

      return {
        name: groupRecord.name,
        participantCount: groupRecord.GroupMember.length,
        totals: (groupRecord.totals as Record<string, number>) ?? {},
        expenses,
        inviteCode: groupRecord.inviteCode,
        members,
        memberBalances,
        directDebts,
        directCredits,
        settlementDebts,
        isOwner: groupRecord.ownerId === userId,
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  });
