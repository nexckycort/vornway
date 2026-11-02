import { Effect } from 'effect';
import { NotificationInbox } from '#/infrastructure/notifications/inbox';
import { Push } from '#/infrastructure/push/push';
import type { PushNotificationPayload } from '#/infrastructure/push/types';

export const makeGroupNotifier = Effect.gen(function* () {
  const inbox = yield* NotificationInbox;
  const push = yield* Push;

  return Effect.fn('GroupNotifier.deliver')(function* (input: {
    userIds: string[];
    type: string;
    payload: PushNotificationPayload;
    actorName: string;
    actorImage?: string | null;
  }) {
    yield* Effect.all(
      [
        inbox
          .createForUsers({
            userIds: input.userIds,
            type: input.type,
            title: input.payload.title,
            body: input.payload.body,
            url: input.payload.url,
            groupId: input.payload.groupId,
            expenseId: input.payload.expenseId,
            actorName: input.actorName,
            actorImage: input.actorImage,
          })
          .pipe(Effect.ignore({ log: true })),
        push
          .sendToUsers(input.userIds, input.payload)
          .pipe(Effect.ignore({ log: true })),
      ],
      { concurrency: 2, discard: true },
    );
  });
});

export const expensePushRecipients = (input: {
  members: readonly { id: string; userId: string | null }[];
  paidByIds: readonly string[];
  participantIds: readonly string[];
  creatorUserId: string;
}) => {
  const involved = new Set([...input.paidByIds, ...input.participantIds]);
  return [
    ...new Set(
      input.members.flatMap((member) =>
        involved.has(member.id) &&
        member.userId &&
        member.userId !== input.creatorUserId
          ? [member.userId]
          : [],
      ),
    ),
  ];
};

export const expensePushPayload = (input: {
  groupId: string;
  groupName: string;
  expenseId: string;
  expenseTitle: string;
  amount: number;
  currency: string;
  createdByName: string;
}): PushNotificationPayload => ({
  title: `Nuevo gasto en ${input.groupName}`,
  body: `${input.createdByName} agregó ${formatAmount(input.amount, input.currency)} por ${input.expenseTitle}`,
  url: `/groups/${input.groupId}/expense/${input.expenseId}`,
  type: 'expense.created',
  tag: `group:${input.groupId}:expenses`,
  groupId: input.groupId,
  expenseId: input.expenseId,
});

export const memberAddedPushPayload = (input: {
  groupId: string;
  groupName: string;
  addedByName: string;
}): PushNotificationPayload => ({
  title: `Te agregaron a ${input.groupName}`,
  body: `${input.addedByName} te agregó al grupo`,
  url: `/groups/${input.groupId}`,
  type: 'group.member.added',
  tag: `group:${input.groupId}:members`,
  groupId: input.groupId,
  expenseId: null,
});

const formatAmount = (amount: number, currency: string) =>
  /^[a-z]{3}$/i.test(currency)
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(amount)
    : `${amount.toFixed(2)} ${currency}`;
