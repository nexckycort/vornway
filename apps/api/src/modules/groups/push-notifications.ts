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
  paidById: string;
  participantIds: string[];
  creatorUserId: string;
}): string[] {
  const involvedMemberIds = new Set([input.paidById, ...input.participantIds]);
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
    title: `New expense in ${input.groupName}`,
    body: `${input.createdByName} added ${formattedAmount} for ${input.expenseTitle}`,
    url: `/groups/${input.groupId}/expenses/${input.expenseId}`,
    groupId: input.groupId,
    expenseId: input.expenseId,
  };
}
