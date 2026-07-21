import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { quickSplitsClient } from '#/api/quick-splits';
import { m } from '#/paraglide/messages.js';
import type { QuickSplitExpenseDetail } from './use-quick-split-expense-query';

const settleQuickSplitDebtEndpoint =
  quickSplitsClient[':id'].expenses[':expenseId'].settlements.$post;

type SettleQuickSplitExpenseInput = {
  quickSplitId: string;
  expenseId: string;
  expense: QuickSplitExpenseDetail | undefined;
};

type SettlementParticipantOption = {
  id: string;
  name: string;
  userId: string | null;
  share: number;
  isPayer: boolean;
};

function normalizeAmount(value: number) {
  return Number(value.toFixed(2));
}

function formatEditableAmount(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace('.', ',');
}

function parseEditableAmount(value: string) {
  return normalizeAmount(Number.parseFloat(value.replace(',', '.')) || 0);
}

function uniqueParticipantOptions(
  expense: QuickSplitExpenseDetail | undefined,
): SettlementParticipantOption[] {
  if (!expense) return [];

  const settledByParticipant = new Map<string, number>();
  for (const settlement of expense.settlements) {
    settledByParticipant.set(
      settlement.from.id,
      (settledByParticipant.get(settlement.from.id) ?? 0) + settlement.amount,
    );
  }

  const participants = new Map<string, SettlementParticipantOption>();

  for (const participant of expense.participants) {
    participants.set(participant.id, {
      id: participant.id,
      name: participant.name,
      userId: participant.userId,
      share: Math.max(
        0,
        normalizeAmount(
          participant.share - (settledByParticipant.get(participant.id) ?? 0),
        ),
      ),
      isPayer: participant.id === expense.paidBy.id,
    });
  }

  if (!participants.has(expense.paidBy.id)) {
    participants.set(expense.paidBy.id, {
      id: expense.paidBy.id,
      name: expense.paidBy.name,
      userId: expense.paidBy.userId,
      share: Math.max(
        0,
        normalizeAmount(
          expense.amount - (settledByParticipant.get(expense.paidBy.id) ?? 0),
        ),
      ),
      isPayer: true,
    });
  }

  return Array.from(participants.values());
}

export function useSettleQuickSplitDebt(input: SettleQuickSplitExpenseInput) {
  const queryClient = useQueryClient();
  const participantOptions = useMemo(
    () => uniqueParticipantOptions(input.expense),
    [input.expense],
  );
  const [fromParticipantId, setFromParticipantId] = useState('');
  const [toParticipantId, setToParticipantId] = useState('');
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    if (participantOptions.length < 2) {
      setFromParticipantId('');
      setToParticipantId('');
      setAmountInput('');
      return;
    }

    const defaultTo =
      participantOptions.find((participant) => participant.isPayer)?.id ??
      participantOptions[0]?.id ??
      '';
    const defaultFrom =
      participantOptions.find(
        (participant) => participant.id !== defaultTo && participant.share > 0,
      )?.id ??
      participantOptions.find((participant) => participant.id !== defaultTo)
        ?.id ??
      '';
    const defaultAmount =
      participantOptions.find((participant) => participant.id === defaultFrom)
        ?.share ?? 0;

    setFromParticipantId((current) =>
      current &&
      participantOptions.some((participant) => participant.id === current)
        ? current
        : defaultFrom,
    );
    setToParticipantId((current) =>
      current &&
      participantOptions.some((participant) => participant.id === current)
        ? current
        : defaultTo,
    );
    setAmountInput((current) =>
      current.trim().length > 0 ? current : formatEditableAmount(defaultAmount),
    );
  }, [participantOptions]);

  const fromParticipant =
    participantOptions.find(
      (participant) => participant.id === fromParticipantId,
    ) ?? null;
  const toParticipant =
    participantOptions.find(
      (participant) => participant.id === toParticipantId,
    ) ?? null;
  const amount = parseEditableAmount(amountInput);
  const canSettleExpense = participantOptions.length >= 2;
  const canSubmitSettlement =
    canSettleExpense &&
    Boolean(fromParticipant) &&
    Boolean(toParticipant) &&
    fromParticipantId !== toParticipantId &&
    amount > 0;

  const mutation = useMutation({
    mutationFn: async ({
      param,
      json,
    }: Parameters<typeof settleQuickSplitDebtEndpoint>[0]) => {
      const response = await settleQuickSplitDebtEndpoint({ param, json });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? m['system.settleExpenseFailed']());
      }

      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({
          queryKey: ['home-recent-quick-split-expenses'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['quick-split-expenses'],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            'quick-split-expense',
            input.quickSplitId,
            input.expenseId,
          ],
        }),
      ]);

      toast.success(m['quickSplit.settleExpenseSuccess']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['quickSplit.settleExpenseUnavailable'](),
      );
    },
  });

  return {
    participantOptions,
    fromParticipantId,
    toParticipantId,
    amountInput,
    canSettleExpense,
    canSubmitSettlement,
    isPending: mutation.isPending,
    setFromParticipantId: (value: string) => {
      setFromParticipantId(value);
      const nextAmount =
        participantOptions.find((participant) => participant.id === value)
          ?.share ?? 0;
      setAmountInput(formatEditableAmount(nextAmount));
    },
    setToParticipantId,
    setAmountInput,
    settleExpense: async () => {
      if (!canSubmitSettlement || !fromParticipant || !toParticipant) {
        toast.error(m['quickSplit.settleExpenseUnavailable']());
        return;
      }

      await mutation.mutateAsync({
        param: {
          id: input.quickSplitId,
          expenseId: input.expenseId,
        },
        json: {
          fromParticipantId: fromParticipant.id,
          toParticipantId: toParticipant.id,
          amount,
          currency: input.expense?.currency ?? 'COP',
        },
      });
    },
  };
}
