import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export type UpsertQuickSplitExpenseValues = {
  currentUserId: string;
  quickSplitId?: string;
  expenseId?: string;
  name: string;
  description: string;
  participants: Array<{
    clientId: string;
    name: string;
    userId?: string;
  }>;
  amount: number;
  currency: string;
  paidByParticipantId: string;
  splitMethod: 'equal' | 'percentage' | 'exact';
  percentageShares?: Record<string, number>;
  exactShares?: Record<string, number>;
  metadata?: {
    category?: string;
    items?: Array<{ name: string; amount: number }>;
  };
};

async function upsertQuickSplitExpense(values: UpsertQuickSplitExpenseValues) {
  if (values.quickSplitId && values.expenseId) {
    const expense = await withErrorMessage(
      api.quickSplits.updateExpense.request({
        params: {
          id: values.quickSplitId,
          expenseId: values.expenseId,
        },
        payload: {
          description: values.description,
          amount: values.amount,
          currency: values.currency,
          paidByParticipantId: values.paidByParticipantId,
          splitMethod: values.splitMethod,
          ...(values.percentageShares
            ? { percentageShares: values.percentageShares }
            : {}),
          ...(values.exactShares ? { exactShares: values.exactShares } : {}),
          ...(values.metadata ? { metadata: values.metadata } : {}),
        },
      }),
      m['system.updateExpenseFailed'](),
    );

    return {
      quickSplit: {
        id: values.quickSplitId,
        name: values.name,
        description: values.description,
      },
      expense,
      mode: 'update' as const,
    };
  }

  const quickSplit = await withErrorMessage(
    api.quickSplits.create.request({
      payload: {
        name: values.name,
        description: values.description,
        participants: values.participants,
      },
    }),
    m['system.createExpenseFailed'](),
  );
  const participantIdByClientId = new Map<string, string>();
  const currentUserParticipantId = (quickSplit.participants ?? []).find(
    (participant) => participant.userId === values.currentUserId,
  )?.id;

  for (const participant of quickSplit.participants ?? []) {
    if (participant.clientId) {
      participantIdByClientId.set(participant.clientId, participant.id);
    }
  }

  const paidByParticipantId =
    values.paidByParticipantId === values.currentUserId
      ? currentUserParticipantId
      : participantIdByClientId.get(values.paidByParticipantId);
  if (!paidByParticipantId) {
    throw new Error(m['system.mapExpenseParticipantsFailed']());
  }

  const expense = await withErrorMessage(
    api.quickSplits.createExpense.request({
      params: { id: quickSplit.id },
      payload: {
        description: values.description,
        amount: values.amount,
        currency: values.currency,
        paidByParticipantId,
        splitMethod: values.splitMethod,
        ...(values.percentageShares
          ? {
              percentageShares: Object.fromEntries(
                Object.entries(values.percentageShares).map(([key, value]) => [
                  participantIdByClientId.get(key) ?? key,
                  value,
                ]),
              ),
            }
          : {}),
        ...(values.exactShares
          ? {
              exactShares: Object.fromEntries(
                Object.entries(values.exactShares).map(([key, value]) => [
                  participantIdByClientId.get(key) ?? key,
                  value,
                ]),
              ),
            }
          : {}),
        ...(values.metadata ? { metadata: values.metadata } : {}),
      },
    }),
    m['system.createExpenseFailed'](),
  );

  return {
    quickSplit,
    expense,
    mode: 'create' as const,
  };
}

export function useCreateQuickSplitExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertQuickSplitExpense,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({
          queryKey: ['home-recent-quick-split-expenses'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['quick-split-expenses'],
        }),
        ...(variables.quickSplitId && variables.expenseId
          ? [
              queryClient.invalidateQueries({
                queryKey: [
                  'quick-split-expense',
                  variables.quickSplitId,
                  variables.expenseId,
                ],
              }),
            ]
          : []),
      ]);
    },
  });
}
