import { db } from '~/infrastructure/database/connection';
import { notificationService } from '~/modules/notifications';
import { pushNotificationService } from '~/modules/push';
import {
  deleteExpenseAttachment,
  resolveExpenseAttachmentUrl,
  uploadExpenseAttachment,
} from './expense-attachment.service';
import {
  buildActiveExpenseWhere,
  buildActiveGroupMemberWhere,
  buildGroupAccessWhere,
  createPayerShares,
  createSplitShares,
  getDateEnd,
  getDateStart,
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
  GroupExpenseAdvancedDetails,
  GroupExpenseDetailResult,
  GroupExpenseSharedSplit,
  ListGroupExpensesInput,
  ListGroupExpensesResult,
  ListGroupMemberExpensesInput,
  ListGroupMemberExpensesResult,
  SettleGroupDebtInput,
  UpdateGroupExpenseInput,
} from './types';

function buildExpenseBaseWhere(groupId: string) {
  return {
    ...buildActiveExpenseWhere(groupId),
  };
}

function getNormalizedPayerIds(input: {
  paidById?: string;
  paidByIds?: string[];
}) {
  const payerIds = input.paidByIds?.length
    ? input.paidByIds
    : input.paidById
      ? [input.paidById]
      : [];

  return Array.from(
    new Set(payerIds.map((memberId) => memberId.trim()).filter(Boolean)),
  );
}

function sanitizeAdvancedDetails(
  details: GroupExpenseAdvancedDetails | null | undefined,
): GroupExpenseAdvancedDetails | null {
  if (!details) return null;

  const normalized: GroupExpenseAdvancedDetails = {
    type: details.type ?? 'other',
  };

  const placeName = details.placeName?.trim();
  const address = details.address?.trim();
  const mapUrl = details.mapUrl?.trim();
  const mapEmbedUrl = details.mapEmbedUrl?.trim();
  const contactName = details.contactName?.trim();
  const phone = details.phone?.trim();
  const email = details.email?.trim();
  const bookingCode = details.bookingCode?.trim();
  const reservationTime = details.reservationTime?.trim();
  const websiteUrl = details.websiteUrl?.trim();
  const notes = details.notes?.trim();

  if (placeName) normalized.placeName = placeName;
  if (address) normalized.address = address;
  if (mapUrl) normalized.mapUrl = mapUrl;
  if (mapEmbedUrl) normalized.mapEmbedUrl = mapEmbedUrl;
  if (contactName) normalized.contactName = contactName;
  if (phone) normalized.phone = phone;
  if (email) normalized.email = email;
  if (bookingCode) normalized.bookingCode = bookingCode;
  if (reservationTime) normalized.reservationTime = reservationTime;
  if (websiteUrl) normalized.websiteUrl = websiteUrl;
  if (notes) normalized.notes = notes;

  const hasContent = Object.entries(normalized).some(
    ([key, value]) => key !== 'type' && Boolean(value),
  );

  return hasContent ? normalized : null;
}

function readAdvancedDetails(
  metadata: unknown,
): GroupExpenseAdvancedDetails | null {
  if (!metadata || typeof metadata !== 'object') return null;

  const advancedDetails = (metadata as { advancedDetails?: unknown })
    .advancedDetails;
  if (!advancedDetails || typeof advancedDetails !== 'object') return null;

  return sanitizeAdvancedDetails(
    advancedDetails as GroupExpenseAdvancedDetails,
  );
}

function sanitizeSharedSplit(
  sharedSplit: GroupExpenseSharedSplit | null | undefined,
): GroupExpenseSharedSplit | null {
  if (!sharedSplit) return null;

  const amount = Number(sharedSplit.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (
    sharedSplit.splitMethod !== 'percentage' &&
    sharedSplit.splitMethod !== 'exact'
  ) {
    return null;
  }

  const splitValues = sharedSplit.splitValues
    ? Object.fromEntries(
        Object.entries(sharedSplit.splitValues)
          .map(([memberId, value]) => [memberId, Number(value)] as const)
          .filter(
            ([memberId, value]) =>
              memberId.length > 0 && Number.isFinite(value) && value >= 0,
          ),
      )
    : undefined;

  return {
    amount: normalizeAmount(amount),
    splitMethod: sharedSplit.splitMethod,
    ...(splitValues && Object.keys(splitValues).length > 0
      ? { splitValues }
      : {}),
  };
}

function readSharedSplit(metadata: unknown): GroupExpenseSharedSplit | null {
  if (!metadata || typeof metadata !== 'object') return null;

  const sharedSplit = (metadata as { sharedSplit?: unknown }).sharedSplit;
  if (!sharedSplit || typeof sharedSplit !== 'object') return null;

  return sanitizeSharedSplit(sharedSplit as GroupExpenseSharedSplit);
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
              icon: true,
              color: true,
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
            attachment: true,
            currency: true,
            date: true,
            notes: true,
            status: true,
            deletedAt: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
            paidBy: {
              select: {
                id: true,
                name: true,
              },
            },
            payers: {
              select: {
                memberId: true,
                amount: true,
                member: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: [{ id: 'asc' }],
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
            const currentPayer = currentMember
              ? row.payers.find((payer) => payer.memberId === currentMember.id)
              : null;
            let currentUserBalance: number | null = null;

            if (
              !isPersonal &&
              currentMember &&
              (currentPayer || currentParticipation)
            ) {
              currentUserBalance = 0;
              if (currentPayer) {
                currentUserBalance += currentPayer.amount;
              }
              if (currentParticipation) {
                currentUserBalance -= currentParticipation.share;
              }
              currentUserBalance = normalizeAmount(currentUserBalance);
            }

            const paidByMembers = row.payers.map((payer) => ({
              memberId: payer.memberId,
              name: payer.member.name,
              amount: payer.amount,
            }));

            return {
              id: row.id,
              description: row.description,
              amount: row.amount,
              attachmentUrl: resolveExpenseAttachmentUrl(row.attachment),
              currency: row.currency,
              date: row.date,
              isDeleted: row.status === 'DELETED' || Boolean(row.deletedAt),
              isSettlement,
              isPersonal,
              expenseType: 'standard' as const,
              subExpenseCount: 0,
              settlementToName: isSettlement
                ? (row.participants[0]?.member.name ?? null)
                : null,
              paidBy: row.paidBy,
              paidByMembers,
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
    listGroupMemberExpenses: async ({
      userId,
      groupId,
      memberId,
      limit,
      cursor,
      categoryId,
      uncategorized,
      startDate,
      endDate,
    }: ListGroupMemberExpensesInput): Promise<ListGroupMemberExpensesResult> => {
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

      const targetMember = group.GroupMember.find(
        (member) => member.id === memberId,
      );

      if (!targetMember) {
        throw new Error('Participante no encontrado');
      }

      const currentMember =
        group.GroupMember.find((member) => member.userId === userId) ?? null;

      const where: NonNullable<
        Parameters<typeof db.expense.findMany>[0]
      >['where'] = {
        ...buildExpenseBaseWhere(groupId),
        OR: [
          { paidById: memberId },
          { payers: { some: { memberId } } },
          { participants: { some: { memberId } } },
        ],
        ...(categoryId
          ? { categoryId }
          : uncategorized
            ? { categoryId: null }
            : {}),
        ...(startDate && endDate
          ? {
              date: {
                gte: getDateStart(startDate),
                lte: getDateEnd(endDate),
              },
            }
          : {}),
      };

      const [total, rows, summaryRows] = await Promise.all([
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
            attachment: true,
            currency: true,
            date: true,
            notes: true,
            status: true,
            deletedAt: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
            paidBy: {
              select: {
                id: true,
                name: true,
              },
            },
            payers: {
              select: {
                memberId: true,
                amount: true,
                member: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: [{ id: 'asc' }],
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
        db.expense.findMany({
          where,
          select: {
            currency: true,
            participants: {
              where: {
                memberId,
              },
              select: {
                share: true,
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
      const spentByCurrency = summaryRows.reduce<Record<string, number>>(
        (accumulator, row) => {
          const share = row.participants[0]?.share ?? 0;
          if (share <= 0) return accumulator;

          accumulator[row.currency] = normalizeAmount(
            (accumulator[row.currency] ?? 0) + share,
          );
          return accumulator;
        },
        {},
      );

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
            const currentPayer = currentMember
              ? row.payers.find((payer) => payer.memberId === currentMember.id)
              : null;
            let currentUserBalance: number | null = null;

            if (
              !isPersonal &&
              currentMember &&
              (currentPayer || currentParticipation)
            ) {
              currentUserBalance = 0;
              if (currentPayer) {
                currentUserBalance += currentPayer.amount;
              }
              if (currentParticipation) {
                currentUserBalance -= currentParticipation.share;
              }
              currentUserBalance = normalizeAmount(currentUserBalance);
            }

            const paidByMembers = row.payers.map((payer) => ({
              memberId: payer.memberId,
              name: payer.member.name,
              amount: payer.amount,
            }));
            const participants = row.participants.map((participant) => ({
              memberId: participant.memberId,
              name: participant.member.name,
              share: participant.share,
            }));

            return {
              id: row.id,
              description: row.description,
              amount: row.amount,
              attachmentUrl: resolveExpenseAttachmentUrl(row.attachment),
              currency: row.currency,
              date: row.date,
              isDeleted: row.status === 'DELETED' || Boolean(row.deletedAt),
              isSettlement,
              isPersonal,
              expenseType: 'standard' as const,
              subExpenseCount: 0,
              settlementToName: isSettlement
                ? (row.participants[0]?.member.name ?? null)
                : null,
              paidBy: row.paidBy,
              paidByMembers,
              participants,
              category: row.category,
              participantCount: row._count.participants,
              currentUserBalance,
            };
          })(),
        })),
        summary: {
          spentByCurrency,
        },
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
          attachment: true,
          currency: true,
          date: true,
          notes: true,
          status: true,
          deletedAt: true,
          metadata: true,
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
          paidBy: {
            select: {
              id: true,
              name: true,
            },
          },
          payers: {
            select: {
              memberId: true,
              amount: true,
              member: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: [{ id: 'asc' }],
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
        attachmentUrl: resolveExpenseAttachmentUrl(expense.attachment),
        currency: expense.currency,
        date: expense.date,
        isDeleted: expense.status === 'DELETED' || Boolean(expense.deletedAt),
        isSettlement: Boolean(expense.notes?.includes('[SETTLEMENT:')),
        splitMethod: readSplitMethod(expense.metadata, expense.participants),
        category: expense.category,
        paidBy: expense.paidBy,
        paidByMembers: expense.payers.map((payer) => ({
          memberId: payer.memberId,
          name: payer.member.name,
          amount: payer.amount,
        })),
        participants: expense.participants.map((participant) => ({
          memberId: participant.memberId,
          name: participant.member.name,
          share: participant.share,
        })),
        sharedSplit: readSharedSplit(expense.metadata),
        advancedDetails: readAdvancedDetails(expense.metadata),
      };
    },
    createExpense: async ({
      userId,
      groupId,
      id,
      description,
      amount,
      currency,
      categoryId,
      paidById,
      paidByIds,
      payers,
      participantIds,
      splitMethod,
      exactShares,
      sharedSplit,
      attachmentImage,
      advancedDetails,
    }: CreateGroupExpenseInput): Promise<{ id: string }> => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: { id: true, name: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const normalizedExpenseId = id?.trim() || null;
      if (normalizedExpenseId) {
        const existingExpense = await db.expense.findUnique({
          where: {
            id: normalizedExpenseId,
          },
          select: { id: true, groupId: true },
        });

        if (existingExpense) {
          if (existingExpense.groupId !== groupId) {
            throw new Error('El identificador del gasto ya existe');
          }

          return { id: existingExpense.id };
        }
      }

      const selectedPayerIds = getNormalizedPayerIds({
        paidById,
        paidByIds,
      });

      const members = await db.groupMember.findMany({
        where: {
          groupId,
          id: {
            in: [...selectedPayerIds, ...participantIds],
          },
        },
        select: { id: true, name: true, userId: true },
      });
      const validMemberIds = new Set(members.map((member) => member.id));

      const validPayerIds = selectedPayerIds.filter((memberId) =>
        validMemberIds.has(memberId),
      );

      if (validPayerIds.length === 0) {
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
      const { payerIds: normalizedPayerIds, shares: payerShares } =
        createPayerShares({
          amount,
          payerIds: validPayerIds,
          payers,
        });

      const { shares: participantShares, normalizedMethod } = createSplitShares(
        {
          amount,
          participantIds: validParticipantIds,
          splitMethod,
          exactShares,
        },
      );
      const normalizedAdvancedDetails =
        sanitizeAdvancedDetails(advancedDetails);
      const normalizedSharedSplit = sanitizeSharedSplit(sharedSplit);

      const expense = await db.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            ...(normalizedExpenseId ? { id: normalizedExpenseId } : {}),
            groupId,
            paidById: normalizedPayerIds[0] ?? validPayerIds[0],
            ...(categoryId ? { categoryId } : {}),
            description,
            amount,
            currency,
            metadata: {
              splitMethod: normalizedMethod,
              splitValues: exactShares ?? null,
              sharedSplit: normalizedSharedSplit,
              advancedDetails: normalizedAdvancedDetails,
            },
            payers: {
              create: normalizedPayerIds.map((memberId) => ({
                memberId,
                amount: payerShares[memberId] ?? 0,
              })),
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
              paidByIds: normalizedPayerIds,
              participants: validParticipantIds.length,
              splitMethod: normalizedMethod,
              advancedDetails: Boolean(normalizedAdvancedDetails),
            },
          },
        });

        return created;
      });

      if (attachmentImage) {
        const attachmentPath = await uploadExpenseAttachment({
          groupId,
          expenseId: expense.id,
          dataUrl: attachmentImage.dataUrl,
        });

        await db.expense.update({
          where: { id: expense.id },
          data: { attachment: attachmentPath },
        });
      }

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
                in: [...normalizedPayerIds, ...validParticipantIds],
              },
            },
            select: {
              id: true,
              name: true,
              userId: true,
              user: { select: { image: true } },
            },
          }),
        ]);

        const recipientUserIds = getExpensePushRecipientUserIds({
          members: pushMembers,
          paidByIds: normalizedPayerIds,
          participantIds: validParticipantIds,
          creatorUserId: userId,
        });

        if (group && recipientUserIds.length > 0) {
          const actorImage =
            pushMembers.find((member) => member.userId === userId)?.user
              ?.image ?? null;
          const pushPayload = buildExpensePushPayload({
            groupId,
            groupName: group.name,
            expenseId: expense.id,
            expenseTitle: description,
            amount,
            currency,
            createdByName: membership.name,
          });

          void notificationService
            .createForUsers({
              userIds: recipientUserIds,
              type: 'expense.created',
              title: pushPayload.title,
              body: pushPayload.body,
              url: pushPayload.url,
              groupId,
              expenseId: expense.id,
              actorName: membership.name,
              actorImage,
            })
            .catch((error) => {
              console.warn('Failed to create expense inbox notification', {
                groupId,
                expenseId: expense.id,
                error,
              });
            });

          void pushNotificationService
            .sendToUsers(recipientUserIds, pushPayload)
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
      paidByIds,
      payers,
      participantIds,
      splitMethod,
      exactShares,
      sharedSplit,
      attachmentImage,
      advancedDetails,
    }: UpdateGroupExpenseInput): Promise<{ id: string }> => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: { id: true, name: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const selectedPayerIds = getNormalizedPayerIds({
        paidById,
        paidByIds,
      });

      const members = await db.groupMember.findMany({
        where: {
          groupId,
          id: {
            in: [...selectedPayerIds, ...participantIds],
          },
        },
        select: { id: true },
      });
      const validMemberIds = new Set(members.map((member) => member.id));

      const validPayerIds = selectedPayerIds.filter((memberId) =>
        validMemberIds.has(memberId),
      );

      if (validPayerIds.length === 0) {
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
      const { payerIds: normalizedPayerIds, shares: payerShares } =
        createPayerShares({
          amount,
          payerIds: validPayerIds,
          payers,
        });
      const { shares: participantShares, normalizedMethod } = createSplitShares(
        {
          amount,
          participantIds: validParticipantIds,
          splitMethod,
          exactShares,
        },
      );
      const normalizedAdvancedDetails =
        sanitizeAdvancedDetails(advancedDetails);
      const normalizedSharedSplit = sanitizeSharedSplit(sharedSplit);

      const expense = await db.$transaction(async (tx) => {
        const existingExpense = await tx.expense.findFirst({
          where: {
            id: expenseId,
            groupId,
          },
          select: {
            id: true,
            amount: true,
            attachment: true,
            currency: true,
            description: true,
            notes: true,
            status: true,
            deletedAt: true,
          },
        });

        if (!existingExpense) {
          throw new Error('Gasto no encontrado');
        }

        if (
          existingExpense.status === 'DELETED' ||
          existingExpense.deletedAt ||
          existingExpense.notes?.includes('[DELETED]')
        ) {
          throw new Error('No puedes editar un gasto eliminado');
        }

        await tx.expense.update({
          where: { id: existingExpense.id },
          data: {
            description,
            amount,
            currency,
            ...(categoryId ? { categoryId } : { categoryId: null }),
            paidById: normalizedPayerIds[0] ?? validPayerIds[0],
            metadata: {
              splitMethod: normalizedMethod,
              splitValues: exactShares ?? null,
              sharedSplit: normalizedSharedSplit,
              advancedDetails: normalizedAdvancedDetails,
            },
            payers: {
              deleteMany: {},
              create: normalizedPayerIds.map((memberId) => ({
                memberId,
                amount: payerShares[memberId] ?? 0,
              })),
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
              paidByIds: normalizedPayerIds,
              participants: validParticipantIds.length,
              splitMethod: normalizedMethod,
              advancedDetails: Boolean(normalizedAdvancedDetails),
            },
          },
        });

        return {
          id: existingExpense.id,
          previousAttachment: existingExpense.attachment,
        };
      });

      if (attachmentImage) {
        const attachmentPath = await uploadExpenseAttachment({
          groupId,
          expenseId: expense.id,
          dataUrl: attachmentImage.dataUrl,
        });

        await db.expense.update({
          where: { id: expense.id },
          data: { attachment: attachmentPath },
        });

        if (
          expense.previousAttachment &&
          expense.previousAttachment !== attachmentPath
        ) {
          await deleteExpenseAttachment(expense.previousAttachment).catch(
            () => undefined,
          );
        }
      }

      return { id: expense.id };
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
          attachment: true,
          currency: true,
          description: true,
          notes: true,
          status: true,
          deletedAt: true,
        },
      });

      if (!expense) {
        throw new Error('Gasto no encontrado');
      }

      if (
        expense.status === 'DELETED' ||
        expense.deletedAt ||
        expense.notes?.includes('[DELETED]')
      ) {
        return { id: expense.id };
      }

      const deletedAt = new Date();
      await db.$transaction(async (tx) => {
        await tx.expense.update({
          where: { id: expense.id },
          data: {
            status: 'DELETED',
            deletedAt,
            deletedById: userId,
            notes: expense.notes
              ? `${expense.notes} [DELETED:${deletedAt.toISOString()}]`
              : `[DELETED:${deletedAt.toISOString()}]`,
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

      if (expense.attachment) {
        await deleteExpenseAttachment(expense.attachment).catch(
          () => undefined,
        );
      }

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
            payers: {
              create: [
                {
                  memberId: fromMemberId,
                  amount,
                },
              ],
            },
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
