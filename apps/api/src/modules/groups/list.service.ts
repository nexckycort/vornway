import { db } from '~/infrastructure/database/connection';
import {
  buildActiveExpenseWhere,
  buildGroupAccessWhere,
  normalizeAmount,
} from './helpers';
import type { GroupListItem, ListGroupsInput, ListGroupsResult } from './types';

type CurrentUserIdentity = { name: string | null; image: string | null } | null;

const groupListSelect = {
  id: true,
  name: true,
  type: true,
  description: true,
  imageUrl: true,
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

function buildGroupListWhere(input: { userId: string; search?: string }) {
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
    currentUser: CurrentUserIdentity;
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
    imageUrl: row.imageUrl,
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
  currentUser: CurrentUserIdentity;
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
  currentUser: CurrentUserIdentity;
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
        ? (pageRows[pageRows.length - 1]?.id ?? null)
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
    nextCursor: hasNextPage
      ? (pageRows[pageRows.length - 1]?.id ?? null)
      : null,
  };
}

export function createGroupListService() {
  return {
    listGroups: async ({
      userId,
      limit,
      cursor,
      search,
      filter = 'all',
    }: ListGroupsInput): Promise<ListGroupsResult> => {
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
  };
}
