import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, withErrorMessage } from '@/lib/api';
import type { Activity } from './format';

const parseAmount = (value: string) => {
  const amount = Number(value.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid');
  return amount;
};

export function useDebtMutations(id: string) {
  const queryClient = useQueryClient();
  const params = { id };
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: api.debts.key() }),
      queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
    ]);
  const options = { onSuccess: invalidate };

  const payment = useMutation({
    ...options,
    mutationFn: (input: { amount: string; date: string; note: string }) =>
      withErrorMessage(
        api.debts.payment.request({
          params,
          payload: {
            amount: parseAmount(input.amount),
            paidAt: new Date(input.date),
            ...(input.note.trim() ? { note: input.note.trim() } : {}),
          },
        }),
        'payment_failed',
      ),
  });
  const remove = useMutation({
    ...options,
    mutationFn: () =>
      withErrorMessage(api.debts.delete.request({ params }), 'delete_failed'),
  });
  const loan = useMutation({
    ...options,
    mutationFn: (input: { amount: string; date: string }) =>
      withErrorMessage(
        api.debts.addAmount.request({
          params,
          payload: {
            amount: parseAmount(input.amount),
            loanDate: new Date(input.date),
          },
        }),
        'loan_failed',
      ),
  });
  const update = useMutation({
    ...options,
    mutationFn: (input: {
      name: string;
      description: string;
      dueDate: string;
    }) =>
      withErrorMessage(
        api.debts.update.request({
          params,
          payload: {
            name: input.name.trim(),
            ...(input.description.trim()
              ? { description: input.description.trim() }
              : {}),
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
          },
        }),
        'debt_update_failed',
      ),
  });
  const updateActivity = useMutation({
    ...options,
    mutationFn: (input: {
      activity: Activity;
      amount: string;
      date: string;
      note: string;
    }) => {
      const amount = Number(input.amount.replace(',', '.'));
      const date = new Date(input.date);
      return withErrorMessage(
        input.activity.kind === 'loan'
          ? api.debts.updateAmount.request({
              params: { id, amountId: input.activity.id },
              payload: { amount, loanDate: date },
            })
          : api.debts.updatePayment.request({
              params: { id, paymentId: input.activity.id },
              payload: { amount, paidAt: date, note: input.note.trim() },
            }),
        'activity_update_failed',
      );
    },
  });
  const deleteActivity = useMutation({
    ...options,
    mutationFn: (activity: Activity) =>
      withErrorMessage(
        activity.kind === 'loan'
          ? api.debts.deleteAmount.request({
              params: { id, amountId: activity.id },
            })
          : api.debts.deletePayment.request({
              params: { id, paymentId: activity.id },
            }),
        'activity_delete_failed',
      ),
  });

  return { payment, remove, loan, update, updateActivity, deleteActivity };
}
