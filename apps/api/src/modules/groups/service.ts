import { db } from '~/infrastructure/database/connection';
import { Prisma } from '~/generated/prisma/client';
import {
  buildExpensePushPayload,
  buildGroupMemberAddedPushPayload,
  getExpensePushRecipientUserIds,
} from './push-notifications';
import { pushNotificationService } from '~/modules/push';
import type {
  AddGroupMemberInput,
  CreateGroupInput,
  CreateGroupExpenseInput,
  CreateGroupResult,
  DeleteGroupExpenseInput,
  GetGroupExpenseInput,
  GroupListItem,
  GroupReportsTotalsInput,
  GroupReportsTotalsResult,
  GroupExpenseDetailResult,
  GroupSummaryResult,
  ListGroupExpensesInput,
  ListGroupExpensesResult,
  ListGroupsInput,
  ListGroupsResult,
  RemoveGroupMemberInput,
  SearchGroupMembersResult,
  SettleGroupDebtInput,
  UnlinkGroupMemberInput,
  UpdateGroupExpenseInput,
} from './types';

export type GroupsService = {
  listGroups: (input: ListGroupsInput) => Promise<ListGroupsResult>;
  createGroup: (input: CreateGroupInput) => Promise<CreateGroupResult>;
  getGroupSummary: (input: { userId: string; groupId: string }) => Promise<GroupSummaryResult>;
  listGroupExpenses: (input: ListGroupExpensesInput) => Promise<ListGroupExpensesResult>;
  getGroupReportsTotals: (
    input: GroupReportsTotalsInput,
  ) => Promise<GroupReportsTotalsResult>;
  getGroupExpense: (input: GetGroupExpenseInput) => Promise<GroupExpenseDetailResult>;
  createExpense: (input: CreateGroupExpenseInput) => Promise<{ id: string }>;
  updateExpense: (input: UpdateGroupExpenseInput) => Promise<{ id: string }>;
  deleteExpense: (input: DeleteGroupExpenseInput) => Promise<{ id: string }>;
  settleDebt: (input: SettleGroupDebtInput) => Promise<{ id: string }>;
  addMember: (input: AddGroupMemberInput) => Promise<{ id: string; name: string }>;
  removeMember: (input: RemoveGroupMemberInput) => Promise<{ id: string; name: string }>;
  unlinkMember: (input: UnlinkGroupMemberInput) => Promise<{ id: string; name: string }>;
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

function buildGroupAccessWhere(userId: string, groupId?: string) {
  return {
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
  } as Prisma.GroupWhereInput;
}

function buildActiveGroupMemberWhere(userId: string, groupId?: string) {
  return {
    ...(groupId ? { groupId } : {}),
    userId,
  } as Prisma.GroupMemberWhereInput;
}

function buildDeletedExpenseWhere(): Prisma.ExpenseWhereInput {
  return {
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
  } as Prisma.ExpenseWhereInput;
}

function buildReportExpenseWhere(input: {
  groupId?: string;
  range: 'all' | 7 | 15 | 30;
}) {
  return {
    ...(input.groupId ? { groupId: input.groupId } : {}),
    ...(input.range === 'all'
      ? {}
      : {
          date: {
            gte: getDaysAgoStart(input.range),
          },
        }),
  } as Prisma.ExpenseWhereInput;
}

function getDaysAgoStart(days: 7 | 15 | 30) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return start;
}

function buildActiveExpenseWhere(groupId?: string): Prisma.ExpenseWhereInput {
  return {
    ...(groupId ? { groupId } : {}),
    ...buildDeletedExpenseWhere(),
  } as Prisma.ExpenseWhereInput;
}

async function getMemberBalanceByCurrency(input: {
  groupId: string;
  memberId: string;
}) {
  const expenses = await db.expense.findMany({
    where: buildActiveExpenseWhere(input.groupId),
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
  });

  const balances = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.paidById === input.memberId) {
      balances.set(
        expense.currency,
        normalizeAmount((balances.get(expense.currency) ?? 0) + expense.amount),
      );
    }

    const participation = expense.participants.find(
      (participant) => participant.memberId === input.memberId,
    );

    if (!participation) {
      continue;
    }

    balances.set(
      expense.currency,
      normalizeAmount((balances.get(expense.currency) ?? 0) - participation.share),
    );
  }

  return balances;
}

async function getMemberExpenseUsageCount(input: {
  groupId: string;
  memberId: string;
}) {
  return db.expense.count({
    where: {
      ...buildActiveExpenseWhere(input.groupId),
      OR: [
        {
          paidById: input.memberId,
        },
        {
          participants: {
            some: {
              memberId: input.memberId,
            },
          },
        },
      ],
    },
  });
}

const groupListSelect = {
  id: true,
  name: true,
  type: true,
  description: true,
  inviteCode: true,
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
          image: true,
        },
      },
    },
    orderBy: [{ joinedAt: 'asc' as const }, { id: 'asc' as const }],
  },
  Expense: {
    where: buildActiveExpenseWhere(),
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
};

function buildGroupListWhere(input: {
  userId: string;
  search?: string;
}) {
  const { userId, search } = input;

  return {
    ...buildGroupAccessWhere(userId),
    type: {
      not: 'meta',
    },
    ...(search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {}),
  };
}

async function fetchGroupListRows(input: {
  userId: string;
  take: number;
  cursor?: string;
  search?: string;
}) {
  return db.group.findMany({
    where: buildGroupListWhere(input),
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    take: input.take,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: groupListSelect,
  });
}

type GroupListRow = Awaited<ReturnType<typeof fetchGroupListRows>>[number];

function mapGroupListRow(
  row: GroupListRow,
  input: {
    userId: string;
    currentUser: { name: string | null; image: string | null } | null;
  },
): GroupListItem {
  const { userId, currentUser } = input;
  const currentMember =
    row.GroupMember.find((member) => member.userId === userId) ?? null;
  const orderedMembers = currentMember
    ? [
        ...row.GroupMember.filter((member) => member.id !== currentMember.id),
        currentMember,
      ]
    : row.GroupMember;

  const pairBalances = new Map<string, number>();
  const activeMember = currentMember;

  if (activeMember) {
    for (const expense of row.Expense) {
      if (expense.participants.length === 0) continue;

      if (expense.paidById === activeMember.id) {
        for (const participant of expense.participants) {
          if (participant.memberId === activeMember.id) continue;
          const key = `${participant.memberId}:${expense.currency}`;
          pairBalances.set(
            key,
            (pairBalances.get(key) ?? 0) - participant.share,
          );
        }
        continue;
      }

      const ownShare = expense.participants.find(
        (participant) => participant.memberId === activeMember.id,
      );
      if (!ownShare) continue;

      const key = `${expense.paidById}:${expense.currency}`;
      pairBalances.set(key, (pairBalances.get(key) ?? 0) + ownShare.share);
    }
  }

  const participantBalances: GroupListItem['participantBalances'] = [];

  for (const [key, rawValue] of pairBalances.entries()) {
    if (Math.abs(rawValue) < 0.01) continue;

    const [memberId, currency] = key.split(':');
    const member = orderedMembers.find((item) => item.id === memberId);
    const direction = rawValue < 0 ? 'theyOweYou' : 'youOweThem';
    const amount = normalizeAmount(Math.abs(rawValue));

    participantBalances.push({
      memberId,
      memberName: member?.name ?? 'Participante',
      currency,
      amount,
      direction,
      label:
        direction === 'theyOweYou'
          ? `Te debe ${amount.toLocaleString()} ${currency}`
          : `Debes ${amount.toLocaleString()} ${currency}`,
    });
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    inviteCode: row.inviteCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    participantCount: row.GroupMember.length,
    totals: (row.totals as Record<string, number>) ?? {},
    members: orderedMembers.map((member) => ({
      id: member.id,
      name: member.name,
      image: member.user?.image ?? null,
    })),
    currentUser: currentMember
      ? {
          memberId: currentMember.id,
          name: currentMember.name,
          image: currentMember.user?.image ?? null,
        }
      : currentUser
        ? {
            memberId: userId,
            name: currentUser.name ?? 'Usuario',
            image: currentUser.image,
          }
        : null,
    hasExpenses: row.Expense.length > 0,
    participantBalances,
    myMembership: currentMember
      ? {
          id: currentMember.id,
          name: currentMember.name,
          role: currentMember.role,
        }
      : null,
  };
}

function groupMatchesFilter(
  group: GroupListItem,
  filter: 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt',
) {
  if (filter === 'all') return true;

  const hasCredits = group.participantBalances.some(
    (item) => item.direction === 'theyOweYou' && item.amount > 0,
  );
  const hasDebts = group.participantBalances.some(
    (item) => item.direction === 'youOweThem' && item.amount > 0,
  );

  if (filter === 'theyOweYou') return hasCredits;
  if (filter === 'youOweThem') return hasDebts;
  return !hasCredits && !hasDebts;
}

async function countMatchingGroups(input: {
  userId: string;
  search?: string;
  filter: 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt';
  currentUser: { name: string | null; image: string | null } | null;
}) {
  if (input.filter === 'all') {
    return db.group.count({
      where: buildGroupListWhere({
        userId: input.userId,
        search: input.search,
      }),
    });
  }

  let cursor: string | undefined;
  let total = 0;

  while (true) {
    const rows = await fetchGroupListRows({
      userId: input.userId,
      search: input.search,
      cursor,
      take: 100,
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      const group = mapGroupListRow(row, {
        userId: input.userId,
        currentUser: input.currentUser,
      });

      if (groupMatchesFilter(group, input.filter)) {
        total += 1;
      }
    }

    if (rows.length < 100) break;
    cursor = rows[rows.length - 1]?.id;
  }

  return total;
}

async function collectFilteredGroupPage(input: {
  userId: string;
  search?: string;
  filter: 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt';
  cursor?: string;
  limit: number;
  currentUser: { name: string | null; image: string | null } | null;
}) {
  if (input.filter === 'all') {
    const rows = await fetchGroupListRows({
      userId: input.userId,
      search: input.search,
      cursor: input.cursor,
      take: input.limit + 1,
    });

    const hasNextPage = rows.length > input.limit;
    const pageRows = hasNextPage ? rows.slice(0, input.limit) : rows;

    return {
      data: pageRows.map((row) =>
        mapGroupListRow(row, {
          userId: input.userId,
          currentUser: input.currentUser,
        }),
      ),
      nextCursor: hasNextPage
        ? pageRows[pageRows.length - 1]?.id ?? null
        : null,
    };
  }

  const collected: GroupListItem[] = [];
  let cursor = input.cursor;

  while (collected.length < input.limit + 1) {
    const rows = await fetchGroupListRows({
      userId: input.userId,
      search: input.search,
      cursor,
      take: 100,
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      const group = mapGroupListRow(row, {
        userId: input.userId,
        currentUser: input.currentUser,
      });

      if (!groupMatchesFilter(group, input.filter)) continue;

      collected.push(group);

      if (collected.length === input.limit + 1) {
        break;
      }
    }

    if (rows.length < 100 || collected.length === input.limit + 1) break;
    cursor = rows[rows.length - 1]?.id;
  }

  const hasNextPage = collected.length > input.limit;
  const pageRows = hasNextPage ? collected.slice(0, input.limit) : collected;

  return {
    data: pageRows,
    nextCursor: hasNextPage ? pageRows[pageRows.length - 1]?.id ?? null : null,
  };
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
    listGroups: async ({ userId, limit, cursor, search, filter = 'all' }) => {
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          image: true,
        },
      });

      const [total, page] = await Promise.all([
        countMatchingGroups({
          userId,
          search,
          filter,
          currentUser,
        }),
        collectFilteredGroupPage({
          userId,
          search,
          filter,
          cursor,
          limit,
          currentUser,
        }),
      ]);

      return {
        data: page.data,
        pagination: {
          limit,
          total,
          nextCursor: page.nextCursor,
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
                  image: true,
                },
              },
            },
            orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
          },
          Expense: {
            where: buildActiveExpenseWhere(),
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
      const expenseCountByMember = new Map<string, number>();
      const directDebtByPair = new Map<string, number>();
      const allDebtByPair = new Map<string, number>();

      for (const member of group.GroupMember) {
        balanceByMember.set(member.id, {});
        expenseCountByMember.set(member.id, 0);
      }

      for (const expense of group.Expense) {
        if (expense.participants.length === 0) continue;

        const payerCount = expenseCountByMember.get(expense.paidById);
        if (payerCount !== undefined) {
          expenseCountByMember.set(expense.paidById, payerCount + 1);
        }

        const payerBalances = balanceByMember.get(expense.paidById);
        if (payerBalances) {
          payerBalances[expense.currency] = normalizeAmount(
            (payerBalances[expense.currency] ?? 0) + expense.amount,
          );
        }

        for (const participant of expense.participants) {
          const currentCount = expenseCountByMember.get(participant.memberId);
          if (currentCount !== undefined) {
            expenseCountByMember.set(participant.memberId, currentCount + 1);
          }

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
          ownerId: group.ownerId,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          totals: (group.totals as Record<string, number>) ?? {},
        participantCount: group.GroupMember.length,
        members: group.GroupMember.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.user?.email ?? null,
          image: member.user?.image ?? null,
          role: member.role,
          userId: member.userId,
          isCurrentUser: member.userId === userId,
          expenseCount: expenseCountByMember.get(member.id) ?? 0,
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

      const currentMember =
        group.GroupMember.find((member) => member.userId === userId) ?? null;

      const where: NonNullable<Parameters<typeof db.expense.findMany>[0]>['where'] = {
        ...buildActiveExpenseWhere(groupId),
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
              category: row.category,
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
    getGroupReportsTotals: async ({ userId, groupId, range }) => {
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

      const expenses = await db.expense.findMany({
        where: buildReportExpenseWhere({
          groupId: group.id,
          range,
        }),
        select: {
          amount: true,
          currency: true,
          notes: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      });

      const currencyTotals = new Map<string, number>();
      const currencyExpenseCounts = new Map<string, number>();
      const currencyCategories = new Map<string, Map<string, number>>();

      const palette = [
        '#ff7fa3',
        '#f6c15b',
        '#8dd3ff',
        '#7ddfa8',
        '#c4a6ff',
        '#ffae63',
      ];

      for (const expense of expenses) {
        if (expense.notes?.includes('[DELETED]')) continue;
        if (expense.notes?.includes('[SETTLEMENT:')) continue;

        currencyTotals.set(
          expense.currency,
          normalizeAmount((currencyTotals.get(expense.currency) ?? 0) + expense.amount),
        );
        currencyExpenseCounts.set(
          expense.currency,
          (currencyExpenseCounts.get(expense.currency) ?? 0) + 1,
        );

        const categoryName = expense.category?.name?.trim() || 'Sin categoría';
        const categoryMap =
          currencyCategories.get(expense.currency) ?? new Map<string, number>();
        categoryMap.set(
          categoryName,
          normalizeAmount((categoryMap.get(categoryName) ?? 0) + expense.amount),
        );
        currencyCategories.set(expense.currency, categoryMap);
      }

      return {
        range,
        totalsByCurrency: Object.fromEntries(currencyTotals.entries()),
        expenseCountByCurrency: Object.fromEntries(
          currencyExpenseCounts.entries(),
        ),
        categoriesByCurrency: Object.fromEntries(
          Array.from(currencyCategories.entries()).map(([currencyKey, map]) => [
            currencyKey,
            Array.from(map.entries())
              .map(([name, amount], index) => ({
                name,
                amount,
                fill: palette[index % palette.length] ?? '#94a3b8',
              }))
              .sort((left, right) => right.amount - left.amount),
          ]),
        ),
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
        where: buildActiveGroupMemberWhere(userId, groupId),
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
        where: buildActiveGroupMemberWhere(userId, groupId),
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
        where: buildActiveGroupMemberWhere(userId, groupId),
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
        where: buildActiveGroupMemberWhere(userId, groupId),
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
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: { id: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      let member: { id: string; name: string } | null = null;
      let shouldNotify = false;

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

      if (!member) {
        member = await db.groupMember.create({
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
        shouldNotify = Boolean(linkedUserId);
      }

      if (linkedUserId && shouldNotify) {
        void (async () => {
          try {
            const [group, recipient] = await Promise.all([
              db.group.findUnique({
                where: { id: groupId },
                select: { name: true },
              }),
              db.user.findUnique({
                where: { id: linkedUserId },
                select: { id: true },
              }),
            ]);

            if (!group || !recipient) {
              return;
            }

            await pushNotificationService.sendToUsers(
              [linkedUserId],
              buildGroupMemberAddedPushPayload({
                groupId,
                groupName: group.name,
                addedByName: name,
              }),
            );
          } catch (error) {
            console.warn('Failed to send group member push notification', {
              groupId,
              error,
            });
          }
        })();
      }

      return member;
    },
    removeMember: async ({ userId, groupId, memberId }) => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: {
          id: true,
          name: true,
        },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

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
          ownerId: true,
        },
      });

      if (!group) {
        throw new Error('No tienes acceso a este grupo');
      }

      if (group.ownerId !== userId) {
        throw new Error('Solo el creador puede eliminar participantes');
      }

      const targetMember = await db.groupMember.findFirst({
        where: {
          id: memberId,
          groupId,
        },
        select: {
          id: true,
          name: true,
          userId: true,
          role: true,
        },
      });

      if (!targetMember) {
        throw new Error('Participante no encontrado');
      }

      if (targetMember.userId === group.ownerId || targetMember.role === 'admin') {
        throw new Error('No puedes eliminar al creador del grupo');
      }

      const usageCount = await getMemberExpenseUsageCount({
        groupId,
        memberId: targetMember.id,
      });
      if (usageCount > 0) {
        throw new Error('El participante ya tiene gastos');
      }

      await db.$transaction(async (tx) => {
        await tx.groupMember.delete({
          where: { id: targetMember.id },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'group.member_removed',
            targetName: targetMember.name,
            details: {
              memberId: targetMember.id,
            },
          },
        });
      });

      return {
        id: targetMember.id,
        name: targetMember.name,
      };
    },
    unlinkMember: async ({ userId, groupId, memberId }) => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: {
          id: true,
          name: true,
        },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

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
          ownerId: true,
        },
      });

      if (!group) {
        throw new Error('No tienes acceso a este grupo');
      }

      if (group.ownerId !== userId) {
        throw new Error('Solo el creador puede desvincular participantes');
      }

      const targetMember = await db.groupMember.findFirst({
        where: {
          id: memberId,
          groupId,
        },
        select: {
          id: true,
          name: true,
          userId: true,
          role: true,
        },
      });

      if (!targetMember) {
        throw new Error('Participante no encontrado');
      }

      if (!targetMember.userId) {
        throw new Error('El participante ya no tiene una cuenta vinculada');
      }

      if (targetMember.userId === group.ownerId) {
        throw new Error('No puedes desvincular al creador del grupo');
      }

      await db.$transaction(async (tx) => {
        await tx.groupMember.update({
          where: { id: targetMember.id },
          data: {
            userId: null,
          },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'group.member_unlinked',
            targetName: targetMember.name,
            details: {
              memberId: targetMember.id,
            },
          },
        });
      });

      return {
        id: targetMember.id,
        name: targetMember.name,
      };
    },
    searchMembers: async ({ userId, groupId, query }) => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
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
