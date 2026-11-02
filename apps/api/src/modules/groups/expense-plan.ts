import {
  GroupExpenseCategoryInvalid,
  GroupExpenseParticipantsInvalid,
  GroupExpensePayerInvalid,
} from '@vornway/contracts/modules/groups/errors';
import type { ExpensePayload } from '@vornway/contracts/modules/groups/expense-schemas';
import { Effect } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { makeInternalFailure } from '#/modules/shared/internal-failure';
import {
  normalizeExpenseTags,
  sanitizeAdvancedDetails,
  sanitizeSharedSplit,
} from './expense-metadata';
import { createPayerShares, createSplitShares, required } from './helpers';

export type ExpenseInput = typeof ExpensePayload.Type;

export const makeExpensePlanner = Effect.gen(function* () {
  const database = yield* Database;
  const failInternal = yield* makeInternalFailure;

  const validatePersonalAccount = Effect.fn(
    'GroupExpensePlanner.validatePersonalAccount',
  )(function* (
    userId: string,
    accountId: string | null | undefined,
    currency: string,
  ) {
    if (!accountId) return null;
    const account = yield* database.use((db) =>
      db.financeAccount.findFirst({
        where: {
          id: accountId,
          ownerId: userId,
          currency,
          archivedAt: null,
          status: { not: 'CLOSED' },
        },
        select: { id: true },
      }),
    );
    return account
      ? account.id
      : yield* failInternal(new Error('Invalid finance account'));
  });

  return Effect.fn('GroupExpensePlanner.plan')(function* (
    userId: string,
    groupId: string,
    groupType: string,
    payload: ExpenseInput,
  ) {
    const selectedPayerIds = [
      ...new Set(
        (payload.paidByIds?.length
          ? payload.paidByIds
          : payload.paidById
            ? [payload.paidById]
            : []
        )
          .map((memberId) => memberId.trim())
          .filter(Boolean),
      ),
    ];
    const participantIds = payload.participantIds ?? [];
    const members = yield* database.use((db) =>
      db.groupMember.findMany({
        where: {
          groupId,
          id: { in: [...selectedPayerIds, ...participantIds] },
        },
        select: { id: true },
      }),
    );
    const validMemberIds = new Set(members.map((member) => member.id));
    const validPayerIds = selectedPayerIds.filter((memberId) =>
      validMemberIds.has(memberId),
    );
    const [primaryPayerId] = validPayerIds;
    if (primaryPayerId === undefined) {
      return yield* new GroupExpensePayerInvalid();
    }
    if (payload.categoryId) {
      yield* database
        .use((db) =>
          db.expenseCategory.findFirst({
            where: { id: payload.categoryId, groupId },
            select: { id: true },
          }),
        )
        .pipe(required(() => new GroupExpenseCategoryInvalid()));
    }
    const validParticipantIds = [...new Set(participantIds)].filter(
      (memberId) => validMemberIds.has(memberId),
    );
    if (
      payload.lineItems?.some(
        (item) => !validParticipantIds.includes(item.memberId),
      )
    ) {
      return yield* new GroupExpenseParticipantsInvalid();
    }

    const personal = groupType === 'personal';
    const splitMethod = payload.splitMethod ?? 'equal';
    const payers = createPayerShares({
      amount: payload.amount,
      payerIds: validPayerIds,
      payers: payload.payers,
    });
    const advancedDetails = sanitizeAdvancedDetails(
      payload.advancedDetails ?? null,
    );
    return {
      primaryPayerId,
      payerIds: payers.payerIds,
      payerShares: payers.shares,
      participantIds: validParticipantIds,
      participantShares: createSplitShares({
        amount: payload.amount,
        participantIds: validParticipantIds,
        splitMethod,
        exactShares: payload.exactShares,
      }).shares,
      splitMethod,
      advancedDetails,
      accountId: personal
        ? yield* validatePersonalAccount(
            userId,
            payload.accountId,
            payload.currency,
          )
        : null,
      metadata: {
        splitMethod,
        splitValues: payload.exactShares ?? null,
        sharedSplit: sanitizeSharedSplit(payload.sharedSplit ?? null),
        advancedDetails,
        tags: personal ? normalizeExpenseTags(payload.tags) : [],
      },
    };
  });
});

export type ExpensePlan = Effect.Success<
  ReturnType<Effect.Success<typeof makeExpensePlanner>>
>;
