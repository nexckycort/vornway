import { db } from '~/infrastructure/database/connection';
import { pushNotificationService } from '~/modules/push';
import {
  buildActiveExpenseWhere,
  buildActiveGroupMemberWhere,
  buildGroupAccessWhere,
  createSplitShares,
  normalizeAmount,
  readSplitMethod,
} from './helpers';
import {
  buildExpensePushPayload,
  getExpensePushRecipientUserIds,
} from './push-notifications';
import type {
  CreateGroupExpenseInput,
  DeleteGroupExpenseInput,
  GetGroupExpenseInput,
  GroupExpenseDetailResult,
  ListGroupExpensesInput,
  ListGroupExpensesResult,
  SettleGroupDebtInput,
  UpdateGroupExpenseInput,
} from './types';

function buildExpenseBaseWhere(groupId: string) {
  return {
    ...buildActiveExpenseWhere(groupId),
  };
}

export function createGroupExpensesService() {
  return {
    listGroupExpenses: async ({
      userId,
      groupId,
      limit,
      cursor,
    }: ListGroupExpensesInput): Promise<ListGroupExpensesResult> => {
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
          categories: {
            select: {
              id: true,
              name: true,
            },
            orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
          },
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const currentMember =
        group.GroupMember.find((member) => member.userId === userId) ?? null;

      const where: NonNullable<
        Parameters<typeof db.expense.findMany>[0]
      >['where'] = buildExpenseBaseWhere(groupId);

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
      const nextCursor = hasNextPage
        ? (pageRows[pageRows.length - 1]?.id ?? null)
        : null;

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

            if (
              !isPersonal &&
              currentMember &&
              (row.paidBy.id === currentMember.id || currentParticipation)
            ) {
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
    getGroupExpense: async ({
      userId,
      groupId,
      expenseId,
    }: GetGroupExpenseInput): Promise<GroupExpenseDetailResult> => {
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
        splitMethod: readSplitMethod(expense.metadata, expense.participants),
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
      categoryId,
      paidById,
      participantIds,
      splitMethod,
      exactShares,
    }: CreateGroupExpenseInput): Promise<{ id: string }> => {
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

      const category = categoryId
        ? await db.expenseCategory.findFirst({
            where: {
              id: categoryId,
              groupId,
            },
            select: { id: true },
          })
        : null;

      if (categoryId && !category) {
        throw new Error('La categoría no pertenece al grupo');
      }

      const validParticipantIds = Array.from(new Set(participantIds)).filter(
        (memberId) => validMemberIds.has(memberId),
      );

      const { shares: participantShares, normalizedMethod } = createSplitShares(
        {
          amount,
          participantIds: validParticipantIds,
          splitMethod,
          exactShares,
        },
      );

      const expense = await db.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            groupId,
            paidById,
            ...(categoryId ? { categoryId } : {}),
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
      categoryId,
      paidById,
      participantIds,
      splitMethod,
      exactShares,
    }: UpdateGroupExpenseInput): Promise<{ id: string }> => {
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

      const category = categoryId
        ? await db.expenseCategory.findFirst({
            where: {
              id: categoryId,
              groupId,
            },
            select: { id: true },
          })
        : null;

      if (categoryId && !category) {
        throw new Error('La categoría no pertenece al grupo');
      }

      const validParticipantIds = Array.from(new Set(participantIds)).filter(
        (memberId) => validMemberIds.has(memberId),
      );
      const { shares: participantShares, normalizedMethod } = createSplitShares(
        {
          amount,
          participantIds: validParticipantIds,
          splitMethod,
          exactShares,
        },
      );

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
            ...(categoryId ? { categoryId } : { categoryId: null }),
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
          Math.max(
            0,
            (nextTotals[existingExpense.currency] ?? 0) -
              existingExpense.amount,
          ),
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
    deleteExpense: async ({
      userId,
      groupId,
      expenseId,
    }: DeleteGroupExpenseInput): Promise<{ id: string }> => {
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
    }: SettleGroupDebtInput): Promise<{ id: string }> => {
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
  };
}
