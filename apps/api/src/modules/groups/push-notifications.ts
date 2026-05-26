import type { PushNotificationPayload } from '../push';

type GroupMemberForPush = {
  id: string;
  name: string;
  userId: string | null;
};

function formatExpenseAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function getExpensePushRecipientUserIds(input: {
  members: GroupMemberForPush[];
  paidByIds: string[];
  participantIds: string[];
  creatorUserId: string;
}): string[] {
  const involvedMemberIds = new Set([
    ...input.paidByIds,
    ...input.participantIds,
  ]);
  const recipientUserIds = new Set<string>();

  input.members.forEach((member) => {
    if (!involvedMemberIds.has(member.id)) {
      return;
    }

    if (!member.userId || member.userId === input.creatorUserId) {
      return;
    }

    recipientUserIds.add(member.userId);
  });

  return Array.from(recipientUserIds);
}

export function buildExpensePushPayload(input: {
  groupId: string;
  groupName: string;
  expenseId: string;
  expenseTitle: string;
  amount: number;
  currency: string;
  createdByName: string;
}): PushNotificationPayload {
  const formattedAmount = formatExpenseAmount(input.amount, input.currency);

  return {
    title: `Nuevo gasto en ${input.groupName}`,
    body: `${input.createdByName} agregó ${formattedAmount} por ${input.expenseTitle}`,
    url: `/groups/${input.groupId}/expense/${input.expenseId}`,
    groupId: input.groupId,
    expenseId: input.expenseId,
  };
}

export function buildGroupMemberAddedPushPayload(input: {
  groupId: string;
  groupName: string;
  addedByName: string;
}): PushNotificationPayload {
  return {
    title: `Te agregaron a ${input.groupName}`,
    body: `${input.addedByName} te agregó al grupo`,
    url: `/groups/${input.groupId}`,
    groupId: input.groupId,
    expenseId: input.groupId,
  };
}
