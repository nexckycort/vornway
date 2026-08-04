import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import {
  currency,
  currentMonthKey,
  deleteTransactionEndpoint,
  type EditableFinanceTransaction,
  type FinanceTransactionUpdateInput,
  getBrowserTimeZone,
  getTransactionEndpoint,
  parseMoney,
  parseTagsInput,
  summaryEndpoint,
  tagsToInput,
  toInputDate,
  updateTransactionEndpoint,
} from '../../-components/finance-model';
import { TransactionDetailView } from '../../-components/finance-transaction-views';

export const Route = createFileRoute('/_authed/finances/movements/$id/')({
  validateSearch: (search: Record<string, unknown>) => ({
    month:
      typeof search.month === 'string' && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : currentMonthKey(),
    accountId:
      typeof search.accountId === 'string' ? search.accountId : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { month, accountId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const timeZone = getBrowserTimeZone();
  const [editingTransactionName, setEditingTransactionName] = useState('');
  const [editingTransactionAmount, setEditingTransactionAmount] = useState('');
  const [editingTransactionDate, setEditingTransactionDate] = useState('');
  const [editingTransactionCategoryId, setEditingTransactionCategoryId] =
    useState('');
  const [editingTransactionAccountId, setEditingTransactionAccountId] =
    useState('');
  const [editingTransactionTagsInput, setEditingTransactionTagsInput] =
    useState('');

  const transactionQuery = useQuery({
    queryKey: ['finances-transaction', id],
    queryFn: async () => {
      const response = await getTransactionEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
    },
  });
  const summaryQuery = useQuery({
    queryKey: ['finances-summary', month, currency, timeZone],
    queryFn: async () => {
      const response = await summaryEndpoint({
        query: { month, currency, timeZone },
      });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
    },
  });

  const transaction = transactionQuery.data;
  const categories = summaryQuery.data?.categories ?? [];
  const transactionAccounts =
    summaryQuery.data?.accounts.filter(
      (account) => account.status !== 'CLOSED' && account.currency === currency,
    ) ?? [];

  const updateTransactionMutation = useMutation({
    mutationFn: async ({
      transactionId,
      input,
    }: {
      transactionId: string;
      input: FinanceTransactionUpdateInput;
    }) => {
      const response = await updateTransactionEndpoint({
        param: { id: transactionId },
        json: input,
      });
      if (!response.ok) {
        throw new Error(m['finances.transactionUpdateFailed']());
      }
      return response.json();
    },
    onSuccess: async () => {
      await invalidateFinanceQueries();
      toast.success(m['finances.transactionUpdated']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.transactionUpdateFailed'](),
      );
    },
  });
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await deleteTransactionEndpoint({
        param: { id: transactionId },
      });
      if (!response.ok) throw new Error(m['finances.deleteMovementFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateFinanceQueries();
      toast.success(m['finances.movementDeleted']());
      goBack();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.deleteMovementFailed'](),
      );
    },
  });

  function invalidateFinanceQueries() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['finances-transaction', id] }),
      queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
      queryClient.invalidateQueries({
        queryKey: ['finances-account-movements'],
      }),
      queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
    ]);
  }

  function goBack() {
    if (accountId) {
      void navigate({
        to: '/finances/accounts/$id',
        params: { id: accountId },
        search: { month },
      });
      return;
    }

    void navigate({
      to: '/finances',
      search: {
        view: 'dashboard',
        month,
        transactionId: undefined,
        accountId: undefined,
      },
    });
  }

  const prepareTransactionEdit = useCallback(
    (nextTransaction: EditableFinanceTransaction) => {
      setEditingTransactionName(nextTransaction.description);
      setEditingTransactionAmount(String(nextTransaction.amount));
      setEditingTransactionDate(toInputDate(nextTransaction.occurredAt));
      setEditingTransactionCategoryId(nextTransaction.categoryId ?? '');
      setEditingTransactionAccountId(nextTransaction.accountId ?? '');
      setEditingTransactionTagsInput(tagsToInput(nextTransaction.tags));
    },
    [],
  );

  useEffect(() => {
    if (!transaction) return;
    prepareTransactionEdit(transaction);
  }, [prepareTransactionEdit, transaction]);

  function submitTransactionUpdate(
    nextTransaction: EditableFinanceTransaction,
  ) {
    const name = editingTransactionName.trim();
    const parsedAmount = parseMoney(editingTransactionAmount);
    if (!name || parsedAmount <= 0 || !editingTransactionDate) {
      toast.error(m['finances.validation']());
      return;
    }

    updateTransactionMutation.mutate({
      transactionId: nextTransaction.id,
      input: {
        description: name,
        amount: parsedAmount,
        occurredAt: new Date(`${editingTransactionDate}T12:00:00`),
        categoryId: editingTransactionCategoryId || null,
        accountId: editingTransactionAccountId || null,
        tags: parseTagsInput(editingTransactionTagsInput),
      },
    });
  }

  async function shareTransaction(nextTransaction: EditableFinanceTransaction) {
    const text = `${nextTransaction.description}: ${formatCurrency(
      nextTransaction.currency,
      nextTransaction.amount,
      { maximumFractionDigits: 0 },
    )}`;

    if (navigator.share) {
      await navigator.share({ text });
      return;
    }

    await navigator.clipboard.writeText(text);
    toast.success(m['finances.movementShared']());
  }

  return (
    <TransactionDetailView
      month={month}
      transaction={transaction}
      categories={categories}
      transactionAccounts={transactionAccounts}
      editingTransactionName={editingTransactionName}
      editingTransactionAmount={editingTransactionAmount}
      editingTransactionDate={editingTransactionDate}
      editingTransactionCategoryId={editingTransactionCategoryId}
      editingTransactionAccountId={editingTransactionAccountId}
      editingTransactionTagsInput={editingTransactionTagsInput}
      isUpdating={updateTransactionMutation.isPending}
      onBack={goBack}
      onShare={(nextTransaction) => {
        void shareTransaction(nextTransaction);
      }}
      onDelete={deleteTransactionMutation.mutate}
      onPrepareEdit={prepareTransactionEdit}
      onEditingNameChange={setEditingTransactionName}
      onEditingAmountChange={setEditingTransactionAmount}
      onEditingDateChange={setEditingTransactionDate}
      onEditingCategoryChange={setEditingTransactionCategoryId}
      onEditingAccountChange={setEditingTransactionAccountId}
      onEditingTagsInputChange={setEditingTransactionTagsInput}
      onSubmitUpdate={submitTransactionUpdate}
    />
  );
}
