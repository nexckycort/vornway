import { Effect } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { resolveUserImageUrl } from '#/infrastructure/storage/image-urls';
import {
  expensePushPayload,
  expensePushRecipients,
  makeGroupNotifier,
} from './notifications';

export const makeExpenseNotifier = Effect.gen(function* () {
  const database = yield* Database;
  const notify = yield* makeGroupNotifier;

  return Effect.fn('GroupExpenseNotifier.created')(function* (input: {
    userId: string;
    groupId: string;
    expenseId: string;
    description: string;
    amount: number;
    currency: string;
    creatorName: string;
    payerIds: readonly string[];
    participantIds: readonly string[];
  }) {
    const [group, members] = yield* Effect.all(
      [
        database.use((db) =>
          db.group.findUnique({
            where: { id: input.groupId },
            select: { name: true },
          }),
        ),
        database.use((db) =>
          db.groupMember.findMany({
            where: {
              groupId: input.groupId,
              id: { in: [...input.payerIds, ...input.participantIds] },
            },
            select: {
              id: true,
              userId: true,
              user: { select: { image: true, updatedAt: true } },
            },
          }),
        ),
      ],
      { concurrency: 2 },
    );
    const recipients = expensePushRecipients({
      members,
      paidByIds: input.payerIds,
      participantIds: input.participantIds,
      creatorUserId: input.userId,
    });
    if (!group || recipients.length === 0) return;
    const actor = members.find((member) => member.userId === input.userId);
    yield* notify({
      userIds: recipients,
      type: 'expense.created',
      payload: expensePushPayload({
        groupId: input.groupId,
        groupName: group.name,
        expenseId: input.expenseId,
        expenseTitle: input.description,
        amount: input.amount,
        currency: input.currency,
        createdByName: input.creatorName,
      }),
      actorName: input.creatorName,
      actorImage: resolveUserImageUrl(
        actor?.user?.image,
        actor?.user?.updatedAt,
      ),
    });
  });
});
