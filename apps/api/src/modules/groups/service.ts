import { db } from '~/infrastructure/database/connection';
import { buildExpensePushPayload, getExpensePushRecipientUserIds } from './push-notifications';
import { pushNotificationService } from '~/modules/push';
import type {
  AddGroupMemberInput,
  CreateGroupInput,
  CreateGroupExpenseInput,
  CreateGroupResult,
  DeleteGroupExpenseInput,
  GetGroupExpenseInput,
  GroupListItem,
  GroupExpenseDetailResult,
  GroupSummaryResult,
  ListGroupExpensesInput,
  ListGroupExpensesResult,
  ListGroupsInput,
  ListGroupsResult,
  SearchGroupMembersResult,
  SettleGroupDebtInput,
  UpdateGroupExpenseInput,
} from './types';

export type GroupsService = {
  listGroups: (input: ListGroupsInput) => Promise<ListGroupsResult>;
  createGroup: (input: CreateGroupInput) => Promise<CreateGroupResult>;
  getGroupSummary: (input: { userId: string; groupId: string }) => Promise<GroupSummaryResult>;
  listGroupExpenses: (input: ListGroupExpensesInput) => Promise<ListGroupExpensesResult>;
  getGroupExpense: (input: GetGroupExpenseInput) => Promise<GroupExpenseDetailResult>;
  createExpense: (input: CreateGroupExpenseInput) => Promise<{ id: string }>;
  updateExpense: (input: UpdateGroupExpenseInput) => Promise<{ id: string }>;
  deleteExpense: (input: DeleteGroupExpenseInput) => Promise<{ id: string }>;
  settleDebt: (input: SettleGroupDebtInput) => Promise<{ id: string }>;
  addMember: (input: AddGroupMemberInput) => Promise<{ id: string; name: string }>;
  searchMembers: (input: {
    userId: string;
    groupId: string;
    query: string;
  }) => Promise<SearchGroupMembersResult>;
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

function createSplitShares(input: {
  amount: number;
  participantIds: string[];
  splitMethod: 'equal' | 'percentage' | 'exact';
  exactShares?: Record<string, number>;
}) {
  const { amount, participantIds, splitMethod, exactShares } = input;

  if (participantIds.length === 0) {
    return {
      shares: {} as Record<string, number>,
      normalizedMethod: 'equal' as const,
    };
  }

  if (splitMethod === 'equal') {
    const share = normalizeAmount(amount / participantIds.length);
    return {
      shares: Object.fromEntries(
        participantIds.map((memberId) => [memberId, share]),
      ) as Record<string, number>,
      normalizedMethod: splitMethod,
    };
  }

  const values = exactShares ?? {};
  const baseShares = Object.fromEntries(
    participantIds.map((memberId) => [
      memberId,
      Number(values[memberId] ?? 0),
    ]),
  ) as Record<string, number>;

  const total = Object.values(baseShares).reduce((sum, value) => sum + value, 0);

  if (
    participantIds.some((memberId) => {
      const value = baseShares[memberId];
      return !Number.isFinite(value) || value < 0;
    })
  ) {
    throw new Error('Las participaciones son inválidas');
  }

  if (splitMethod === 'percentage') {
    if (Math.abs(total - 100) >= 0.01) {
      throw new Error('La suma de porcentajes debe ser 100');
    }

    return {
      shares: Object.fromEntries(
        participantIds.map((memberId) => [
          memberId,
          normalizeAmount((amount * baseShares[memberId]) / 100),
        ]),
      ) as Record<string, number>,
      normalizedMethod: splitMethod,
    };
  }

  if (Math.abs(total - amount) >= 0.01) {
    throw new Error('La suma de montos debe ser igual al total');
  }

  return {
    shares: Object.fromEntries(
      participantIds.map((memberId) => [memberId, normalizeAmount(baseShares[memberId])]),
    ) as Record<string, number>,
    normalizedMethod: splitMethod,
  };
}

function readSplitMethod(
  metadata: unknown,
  participants: Array<{ share: number }>,
): 'equal' | 'percentage' | 'exact' {
  if (
    metadata &&
    typeof metadata === 'object' &&
    'splitMethod' in metadata &&
    (metadata as { splitMethod?: unknown }).splitMethod &&
    ['equal', 'percentage', 'exact'].includes(
      String((metadata as { splitMethod?: unknown }).splitMethod),
    )
  ) {
    return String((metadata as { splitMethod?: unknown }).splitMethod) as
      | 'equal'
      | 'percentage'
      | 'exact';
  }

  if (participants.length === 0) {
    return 'equal';
  }

  const firstShare = participants[0]?.share ?? 0;
  const allEqual = participants.every(
    (participant) => Math.abs(participant.share - firstShare) < 0.01,
  );

  return allEqual ? 'equal' : 'exact';
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
      const allDebtByPair = new Map<string, number>();

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

          if (participant.memberId !== expense.paidById) {
            const key = `${participant.memberId}:${expense.paidById}:${expense.currency}`;
            allDebtByPair.set(
              key,
              normalizeAmount((allDebtByPair.get(key) ?? 0) + participant.share),
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

      const settlementDebts = Array.from(allDebtByPair.entries())
        .map(([pairKey, amount]) => {
          const [fromMemberId, toMemberId, currency] = pairKey.split(':');
          const reverseAmount =
            allDebtByPair.get(`${toMemberId}:${fromMemberId}:${currency}`) ?? 0;
          return {
            fromMemberId,
            fromName: memberNameById.get(fromMemberId) ?? 'Miembro',
            toMemberId,
            toName: memberNameById.get(toMemberId) ?? 'Miembro',
            currency,
            amount: normalizeAmount(amount - reverseAmount),
          };
        })
        .filter((entry) => entry.amount > 0)
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
        settlementDebts,
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
            const isSettlement = Boolean(row.notes?.includes('[SETTLEMENT:'));
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
              expenseType: 'standard' as const,
              subExpenseCount: 0,
              settlementToName: isSettlement
                ? (row.participants[0]?.member.name ?? null)
                : null,
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
    getGroupExpense: async ({ userId, groupId, expenseId }) => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const expense = await db.expense.findFirst({
        where: {
          id: expenseId,
          groupId: group.id,
        },
        select: {
          id: true,
          description: true,
          amount: true,
          currency: true,
          date: true,
          notes: true,
          metadata: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
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
            orderBy: [{ memberId: 'asc' }],
          },
        },
      });

      if (!expense) {
        throw new Error('Gasto no encontrado');
      }

      return {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        isDeleted: Boolean(expense.notes?.includes('[DELETED]')),
        isSettlement: Boolean(expense.notes?.includes('[SETTLEMENT:')),
        splitMethod: readSplitMethod(
          expense.metadata,
          expense.participants,
        ),
        category: expense.category,
        paidBy: expense.paidBy,
        participants: expense.participants.map((participant) => ({
          memberId: participant.memberId,
          name: participant.member.name,
          share: participant.share,
        })),
      };
    },
    createExpense: async ({
      userId,
      groupId,
      description,
      amount,
      currency,
      paidById,
      participantIds,
      splitMethod,
      exactShares,
    }) => {
      const membership = await db.groupMember.findFirst({
        where: { groupId, userId },
        select: { id: true, name: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const members = await db.groupMember.findMany({
        where: {
          groupId,
          id: {
            in: [paidById, ...participantIds],
          },
        },
        select: { id: true, name: true, userId: true },
      });
      const validMemberIds = new Set(members.map((member) => member.id));

      if (!validMemberIds.has(paidById)) {
        throw new Error('El pagador no pertenece al grupo');
      }

      const validParticipantIds = Array.from(new Set(participantIds)).filter(
        (memberId) => validMemberIds.has(memberId),
      );
      const { shares: participantShares, normalizedMethod } = createSplitShares({
        amount,
        participantIds: validParticipantIds,
        splitMethod,
        exactShares,
      });

      const expense = await db.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            groupId,
            paidById,
            description,
            amount,
            currency,
            metadata: {
              splitMethod: normalizedMethod,
              splitValues: exactShares ?? null,
            },
            ...(validParticipantIds.length > 0
              ? {
                  participants: {
                    create: validParticipantIds.map((memberId) => ({
                      memberId,
                      share: participantShares[memberId] ?? 0,
                    })),
                  },
                }
              : {}),
          },
          select: { id: true },
        });

        const group = await tx.group.findUnique({
          where: { id: groupId },
          select: { totals: true },
        });
        const totals = (group?.totals as Record<string, number>) ?? {};

        await tx.group.update({
          where: { id: groupId },
          data: {
            totals: {
              ...totals,
              [currency]: normalizeAmount((totals[currency] ?? 0) + amount),
            },
          },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'expense.created',
            targetName: description,
            details: {
              expenseId: created.id,
              amount,
              currency,
              paidById,
              participants: validParticipantIds.length,
              splitMethod: normalizedMethod,
            },
          },
        });

        return created;
      });

      try {
        const [group, pushMembers] = await Promise.all([
          db.group.findUnique({
            where: { id: groupId },
            select: { name: true },
          }),
          db.groupMember.findMany({
            where: {
              groupId,
              id: {
                in: [paidById, ...validParticipantIds],
              },
            },
            select: { id: true, name: true, userId: true },
          }),
        ]);

        const recipientUserIds = getExpensePushRecipientUserIds({
          members: pushMembers,
          paidById,
          participantIds: validParticipantIds,
          creatorUserId: userId,
        });

        if (group && recipientUserIds.length > 0) {
          void pushNotificationService
            .sendToUsers(
              recipientUserIds,
              buildExpensePushPayload({
                groupId,
                groupName: group.name,
                expenseId: expense.id,
                expenseTitle: description,
                amount,
                currency,
                createdByName: membership.name,
              }),
            )
            .catch((error) => {
              console.warn('Failed to send expense push notification', {
                groupId,
                expenseId: expense.id,
                error,
              });
            });
        }
      } catch (error) {
        console.warn('Failed to enqueue expense push notification', {
          groupId,
          error,
        });
      }

      return expense;
    },
    updateExpense: async ({
      userId,
      groupId,
      expenseId,
      description,
      amount,
      currency,
      paidById,
      participantIds,
      splitMethod,
      exactShares,
    }) => {
      const membership = await db.groupMember.findFirst({
        where: { groupId, userId },
        select: { id: true, name: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const members = await db.groupMember.findMany({
        where: {
          groupId,
          id: {
            in: [paidById, ...participantIds],
          },
        },
        select: { id: true },
      });
      const validMemberIds = new Set(members.map((member) => member.id));

      if (!validMemberIds.has(paidById)) {
        throw new Error('El pagador no pertenece al grupo');
      }

      const validParticipantIds = Array.from(new Set(participantIds)).filter(
        (memberId) => validMemberIds.has(memberId),
      );
      const { shares: participantShares, normalizedMethod } = createSplitShares({
        amount,
        participantIds: validParticipantIds,
        splitMethod,
        exactShares,
      });

      const expense = await db.$transaction(async (tx) => {
        const existingExpense = await tx.expense.findFirst({
          where: {
            id: expenseId,
            groupId,
          },
          select: {
            id: true,
            amount: true,
            currency: true,
            description: true,
            notes: true,
          },
        });

        if (!existingExpense) {
          throw new Error('Gasto no encontrado');
        }

        if (existingExpense.notes?.includes('[DELETED]')) {
          throw new Error('No puedes editar un gasto eliminado');
        }

        await tx.expense.update({
          where: { id: existingExpense.id },
          data: {
            description,
            amount,
            currency,
            paidById,
            metadata: {
              splitMethod: normalizedMethod,
              splitValues: exactShares ?? null,
            },
          },
        });

        await tx.expenseParticipant.deleteMany({
          where: {
            expenseId: existingExpense.id,
          },
        });

        if (validParticipantIds.length > 0) {
          await tx.expenseParticipant.createMany({
            data: validParticipantIds.map((memberId) => ({
              expenseId: existingExpense.id,
              memberId,
              share: participantShares[memberId] ?? 0,
            })),
          });
        }

        const group = await tx.group.findUnique({
          where: { id: groupId },
          select: { totals: true },
        });
        const totals = (group?.totals as Record<string, number>) ?? {};
        const nextTotals: Record<string, number> = { ...totals };

        nextTotals[existingExpense.currency] = normalizeAmount(
          Math.max(0, (nextTotals[existingExpense.currency] ?? 0) - existingExpense.amount),
        );

        if (nextTotals[existingExpense.currency] === 0) {
          delete nextTotals[existingExpense.currency];
        }

        nextTotals[currency] = normalizeAmount(
          (nextTotals[currency] ?? 0) + amount,
        );

        await tx.group.update({
          where: { id: groupId },
          data: {
            totals: nextTotals,
          },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'expense.updated',
            targetName: description,
            details: {
              expenseId: existingExpense.id,
              amount,
              currency,
              paidById,
              participants: validParticipantIds.length,
              splitMethod: normalizedMethod,
            },
          },
        });

        return { id: existingExpense.id };
      });

      return expense;
    },
    deleteExpense: async ({ userId, groupId, expenseId }) => {
      const membership = await db.groupMember.findFirst({
        where: { groupId, userId },
        select: { id: true, name: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const expense = await db.expense.findFirst({
        where: {
          id: expenseId,
          groupId,
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          description: true,
          notes: true,
        },
      });

      if (!expense) {
        throw new Error('Gasto no encontrado');
      }

      if (expense.notes?.includes('[DELETED]')) {
        return { id: expense.id };
      }

      await db.$transaction(async (tx) => {
        await tx.expense.update({
          where: { id: expense.id },
          data: {
            notes: expense.notes
              ? `${expense.notes} [DELETED:${new Date().toISOString()}]`
              : `[DELETED:${new Date().toISOString()}]`,
          },
        });

        const group = await tx.group.findUnique({
          where: { id: groupId },
          select: { totals: true },
        });
        const totals = (group?.totals as Record<string, number>) ?? {};

        await tx.group.update({
          where: { id: groupId },
          data: {
            totals: {
              ...totals,
              [expense.currency]: normalizeAmount(
                Math.max(0, (totals[expense.currency] ?? 0) - expense.amount),
              ),
            },
          },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'expense.deleted',
            targetName: expense.description,
            details: {
              expenseId: expense.id,
              amount: expense.amount,
              currency: expense.currency,
            },
          },
        });
      });

      return { id: expense.id };
    },
    settleDebt: async ({
      userId,
      groupId,
      fromMemberId,
      toMemberId,
      amount,
      currency,
    }) => {
      const membership = await db.groupMember.findFirst({
        where: { groupId, userId },
        select: { id: true, name: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const members = await db.groupMember.findMany({
        where: {
          groupId,
          id: {
            in: [fromMemberId, toMemberId],
          },
        },
        select: { id: true, name: true },
      });
      const fromMember = members.find((member) => member.id === fromMemberId);
      const toMember = members.find((member) => member.id === toMemberId);

      if (!fromMember || !toMember || fromMember.id === toMember.id) {
        throw new Error('Participantes de liquidación inválidos');
      }

      const expense = await db.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            groupId,
            paidById: fromMemberId,
            description: `Liquidación: ${fromMember.name} -> ${toMember.name}`,
            amount,
            currency,
            notes: `[SETTLEMENT:FLEX] ${new Date().toISOString()} by ${membership.id}`,
            participants: {
              create: [
                {
                  memberId: toMemberId,
                  share: amount,
                },
              ],
            },
          },
          select: { id: true },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'debt.settled',
            targetName: `${fromMember.name} -> ${toMember.name}`,
            details: {
              expenseId: created.id,
              fromMemberId,
              toMemberId,
              amount,
              currency,
            },
          },
        });

        return created;
      });

      return expense;
    },
    addMember: async ({ userId, groupId, name, linkedUserId }) => {
      const membership = await db.groupMember.findFirst({
        where: { groupId, userId },
        select: { id: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      if (linkedUserId) {
        const existingLinkedMember = await db.groupMember.findFirst({
          where: {
            groupId,
            userId: linkedUserId,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (existingLinkedMember) {
          return existingLinkedMember;
        }
      }

      const member = await db.groupMember.create({
        data: {
          groupId,
          name,
          ...(linkedUserId ? { userId: linkedUserId } : {}),
          role: 'member',
        },
        select: {
          id: true,
          name: true,
        },
      });

      return member;
    },
    searchMembers: async ({ userId, groupId, query }) => {
      const membership = await db.groupMember.findFirst({
        where: { groupId, userId },
        select: { id: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return { data: [] };
      }

      const users = await db.user.findMany({
        where: {
          OR: [
            {
              name: {
                contains: trimmedQuery,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: trimmedQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        take: 8,
      });

      const memberUserIds = new Set(
        (
          await db.groupMember.findMany({
            where: {
              groupId,
              userId: {
                in: users.map((candidate) => candidate.id),
              },
            },
            select: { userId: true },
          })
        )
          .map((member) => member.userId)
          .filter((value): value is string => Boolean(value)),
      );

      return {
        data: users.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          isCurrentUser: candidate.id === userId,
          isAlreadyMember: memberUserIds.has(candidate.id),
        })),
      };
    },
  };
}
