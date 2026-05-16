import { db } from '~/infrastructure/database/connection';
import type {
  CreateGroupInput,
  CreateGroupResult,
  GroupListItem,
  GroupSummaryResult,
  ListGroupExpensesInput,
  ListGroupExpensesResult,
  ListGroupsInput,
  ListGroupsResult,
} from './types';

export type GroupsService = {
  listGroups: (input: ListGroupsInput) => Promise<ListGroupsResult>;
  createGroup: (input: CreateGroupInput) => Promise<CreateGroupResult>;
  getGroupSummary: (input: { userId: string; groupId: string }) => Promise<GroupSummaryResult>;
  listGroupExpenses: (input: ListGroupExpensesInput) => Promise<ListGroupExpensesResult>;
};

async function generateInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = crypto.randomUUID().slice(0, 8);
    const exists = await db.group.findUnique({
      where: { inviteCode },
      select: { id: true },
    });

    if (!exists) {
      return inviteCode;
    }
  }

  throw new Error('No se pudo generar un código de invitación único');
}

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

export function createGroupsService(): GroupsService {
  const buildGroupAccessWhere = (userId: string, groupId?: string) => ({
    ...(groupId ? { id: groupId } : {}),
    OR: [
      {
        ownerId: userId,
      },
      {
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    ],
  });

  return {
    createGroup: async ({
      userId,
      ownerName,
      name,
      type,
      description,
      participants,
    }) => {
      const now = new Date();
      const inviteCode = await generateInviteCode();
      const groupId = crypto.randomUUID();
      const normalizedName = name.trim();
      const normalizedType = type.trim();
      const normalizedDescription = description?.trim() || null;

      await db.$transaction(async (tx) => {
        await tx.group.create({
          data: {
            id: groupId,
            name: normalizedName,
            type: normalizedType,
            description: normalizedDescription,
            createdAt: now,
            updatedAt: now,
            ownerId: userId,
            inviteCode,
          },
        });

        await tx.groupMember.create({
          data: {
            groupId,
            userId,
            name: ownerName,
            role: 'admin',
            joinedAt: now,
          },
        });

        const normalizedParticipants = (participants ?? [])
          .map((participant) => ({
            name: participant.name.trim(),
            userId: participant.userId?.trim() || null,
          }))
          .filter((participant) => participant.name.length > 0)
          .filter((participant) => participant.userId !== userId)
          .filter(
            (participant, index, array) =>
              array.findIndex(
                (item) =>
                  (item.userId && item.userId === participant.userId) ||
                  (!item.userId &&
                    item.name.toLocaleLowerCase('es-CO') ===
                      participant.name.toLocaleLowerCase('es-CO')),
              ) === index,
          );

        if (normalizedParticipants.length > 0) {
          await tx.groupMember.createMany({
            data: normalizedParticipants.map((participant) => ({
              groupId,
              userId: participant.userId,
              name: participant.name,
              role: 'member',
              joinedAt: now,
            })),
          });
        }

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: ownerName,
            action: 'group.created',
            targetName: normalizedName,
            details: {
              type: normalizedType,
              participantsCount: (participants ?? []).length,
            },
            createdAt: now,
          },
        });
      });

      return {
        id: groupId,
        name: normalizedName,
        type: normalizedType,
        description: normalizedDescription,
        inviteCode,
        createdAt: now,
      };
    },
    listGroups: async ({ userId, limit, cursor }) => {
      const where: NonNullable<Parameters<typeof db.group.findMany>[0]>['where'] =
        {
          ...buildGroupAccessWhere(userId),
          type: {
            not: 'meta',
          },
        };

      const [total, rows] = await Promise.all([
        db.group.count({ where }),
        db.group.findMany({
          where,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          take: limit + 1,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            inviteCode: true,
            createdAt: true,
            updatedAt: true,
            totals: true,
            GroupMember: {
              where: {
                userId,
              },
              select: {
                id: true,
                name: true,
                role: true,
              },
              take: 1,
            },
            _count: {
              select: {
                GroupMember: true,
              },
            },
          },
        }),
      ]);

      const hasNextPage = rows.length > limit;
      const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
      const nextCursor = hasNextPage ? pageRows[pageRows.length - 1]?.id ?? null : null;

      const data: GroupListItem[] = pageRows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        inviteCode: row.inviteCode,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        participantCount: row._count.GroupMember,
        totals: (row.totals as Record<string, number>) ?? {},
        myMembership: row.GroupMember[0]
          ? {
              id: row.GroupMember[0].id,
              name: row.GroupMember[0].name,
              role: row.GroupMember[0].role,
            }
          : null,
      }));

      return {
        data,
        pagination: {
          limit,
          total,
          nextCursor,
        },
      };
    },
    getGroupSummary: async ({ userId, groupId }) => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          inviteCode: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          totals: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              role: true,
              userId: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
            orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
          },
          Expense: {
            where: {
              OR: [
                { notes: null },
                {
                  notes: {
                    not: {
                      contains: '[DELETED]',
                    },
                  },
                },
              ],
            },
            select: {
              amount: true,
              currency: true,
              paidById: true,
              participants: {
                select: {
                  memberId: true,
                  share: true,
                },
              },
            },
          },
          _count: {
            select: {
              GroupMember: true,
            },
          },
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const myMembership =
        group.GroupMember.find((member) => member.userId === userId) ?? null;
      const memberNameById = new Map(
        group.GroupMember.map((member) => [member.id, member.name]),
      );
      const balanceByMember = new Map<string, Record<string, number>>();
      const directDebtByPair = new Map<string, number>();

      for (const member of group.GroupMember) {
        balanceByMember.set(member.id, {});
      }

      for (const expense of group.Expense) {
        if (expense.participants.length === 0) continue;

        const payerBalances = balanceByMember.get(expense.paidById);
        if (payerBalances) {
          payerBalances[expense.currency] = normalizeAmount(
            (payerBalances[expense.currency] ?? 0) + expense.amount,
          );
        }

        for (const participant of expense.participants) {
          const participantBalances = balanceByMember.get(participant.memberId);
          if (participantBalances) {
            participantBalances[expense.currency] = normalizeAmount(
              (participantBalances[expense.currency] ?? 0) - participant.share,
            );
          }
        }

        if (!myMembership) continue;

        if (expense.paidById === myMembership.id) {
          for (const participant of expense.participants) {
            if (participant.memberId === myMembership.id) continue;
            const key = `${participant.memberId}:${expense.currency}`;
            directDebtByPair.set(
              key,
              normalizeAmount((directDebtByPair.get(key) ?? 0) - participant.share),
            );
          }
          continue;
        }

        const currentParticipation = expense.participants.find(
          (participant) => participant.memberId === myMembership.id,
        );
        if (!currentParticipation) continue;

        const key = `${expense.paidById}:${expense.currency}`;
        directDebtByPair.set(
          key,
          normalizeAmount(
            (directDebtByPair.get(key) ?? 0) + currentParticipation.share,
          ),
        );
      }

      const directDebts = Array.from(directDebtByPair.entries())
        .map(([pairKey, amount]) => {
          const [toMemberId, currency] = pairKey.split(':');
          return {
            toMemberId,
            toName: memberNameById.get(toMemberId) ?? 'Miembro',
            currency,
            amount: normalizeAmount(amount),
          };
        })
        .filter((entry) => entry.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      const directCredits = Array.from(directDebtByPair.entries())
        .map(([pairKey, amount]) => {
          const [fromMemberId, currency] = pairKey.split(':');
          return {
            fromMemberId,
            fromName: memberNameById.get(fromMemberId) ?? 'Miembro',
            currency,
            amount: normalizeAmount(Math.abs(amount)),
          };
        })
        .filter((entry) => entry.amount > 0)
        .filter((entry) => {
          const key = `${entry.fromMemberId}:${entry.currency}`;
          return (directDebtByPair.get(key) ?? 0) < 0;
        })
        .sort((a, b) => b.amount - a.amount);

      return {
        id: group.id,
        name: group.name,
        type: group.type,
        description: group.description,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        totals: (group.totals as Record<string, number>) ?? {},
        participantCount: group._count.GroupMember,
        members: group.GroupMember.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.user?.email ?? null,
          role: member.role,
          userId: member.userId,
          isCurrentUser: member.userId === userId,
        })),
        memberBalances: group.GroupMember.map((member) => ({
          memberId: member.id,
          name: member.name,
          isCurrentUser: member.userId === userId,
          balances: balanceByMember.get(member.id) ?? {},
        })),
        directDebts,
        directCredits,
        myMembership: myMembership
          ? {
              id: myMembership.id,
              name: myMembership.name,
              role: myMembership.role,
            }
          : null,
        isOwner: group.ownerId === userId,
      };
    },
    listGroupExpenses: async ({ userId, groupId, limit, cursor }) => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          GroupMember: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const currentMember = group.GroupMember.find(
        (member) => member.userId === userId,
      );

      const where: NonNullable<Parameters<typeof db.expense.findMany>[0]>['where'] = {
        groupId,
        OR: [
          { notes: null },
          {
            notes: {
              not: {
                contains: '[DELETED]',
              },
            },
          },
        ],
      };

      const [total, rows] = await Promise.all([
        db.expense.count({ where }),
        db.expense.findMany({
          where,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          take: limit + 1,
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            description: true,
            amount: true,
            currency: true,
            date: true,
            notes: true,
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
        }),
      ]);

      const hasNextPage = rows.length > limit;
      const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
      const nextCursor = hasNextPage ? pageRows[pageRows.length - 1]?.id ?? null : null;

      return {
        data: pageRows.map((row) => ({
          ...(() => {
            const isSettlement = false;
            const isPersonal = !isSettlement && row.participants.length === 0;
            const currentParticipation = currentMember
              ? row.participants.find(
                  (participant) => participant.memberId === currentMember.id,
                )
              : null;
            let currentUserBalance: number | null = null;

            if (!isPersonal && currentMember && (row.paidBy.id === currentMember.id || currentParticipation)) {
              currentUserBalance = 0;
              if (row.paidBy.id === currentMember.id) {
                currentUserBalance += row.amount;
              }
              if (currentParticipation) {
                currentUserBalance -= currentParticipation.share;
              }
              currentUserBalance = normalizeAmount(currentUserBalance);
            }

            return {
              id: row.id,
              description: row.description,
              amount: row.amount,
              currency: row.currency,
              date: row.date,
              isDeleted: Boolean(row.notes?.includes('[DELETED]')),
              isSettlement,
              isPersonal,
              isPinned: false,
              pinnedAt: null,
              expenseType: 'standard' as const,
              subExpenseCount: 0,
              settlementToName: null,
              paidBy: row.paidBy,
              category: null,
              participantCount: row._count.participants,
              currentUserBalance,
            };
          })(),
        })),
        pagination: {
          limit,
          total,
          nextCursor,
        },
      };
    },
  };
}
