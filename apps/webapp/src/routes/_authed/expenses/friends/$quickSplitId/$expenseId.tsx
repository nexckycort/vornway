import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Delete,
  PencilLine,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { useAuth } from '#/contexts/auth/use-auth';
import { formatCurrency } from '#/lib/i18n';
import { useDeleteQuickSplitExpenseMutation } from '#/routes/_authed/expenses/-hooks/use-delete-quick-split-expense';
import type { QuickSplitExpenseDetail } from '#/routes/_authed/expenses/-hooks/use-quick-split-expense-query';
import { useQuickSplitExpenseQuery } from '#/routes/_authed/expenses/-hooks/use-quick-split-expense-query';
import { useSettleQuickSplitDebt } from '#/routes/_authed/expenses/-hooks/use-settle-quick-split-debt';
import { getQuickSplitMessages } from '#/routes/_authed/expenses/-messages';

export const Route = createFileRoute(
  '/_authed/expenses/friends/$quickSplitId/$expenseId',
)({
  component: RouteComponent,
});

const expenseDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatAmount(currency: string, amount: number): string {
  try {
    return formatCurrency(currency, amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return expenseDateFormatter.format(date);
}

function formatSettlementAmount(value: string): string {
  const amount = Number.parseFloat(value.replace(',', '.')) || 0;
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 2,
  }).format(amount);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

type Settlement = QuickSplitExpenseDetail['settlements'][number];

function RouteComponent() {
  const t = getQuickSplitMessages();
  const { quickSplitId, expenseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const expenseQuery = useQuickSplitExpenseQuery(quickSplitId, expenseId);
  const deleteExpenseMutation = useDeleteQuickSplitExpenseMutation();
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);
  const [showSettleDrawer, setShowSettleDrawer] = useState(false);

  const fallbackExpense = useMemo(() => {
    const cachedExpenses = queryClient.getQueryData<{
      pages?: Array<{
        data?: Array<{
          id: string;
          quickSplitId: string;
          quickSplitName: string;
          description: string;
          amount: number;
          currency: string;
          participantCount: number;
          paidBy: {
            id: string;
            userId?: string | null;
            name: string;
          };
          createdAt: string;
        }>;
      }>;
    }>(['quick-split-expenses']);
    const items =
      cachedExpenses?.pages?.flatMap((page) => page.data ?? []) ?? [];
    return (
      items.find(
        (item) => item.id === expenseId && item.quickSplitId === quickSplitId,
      ) ?? null
    );
  }, [expenseId, quickSplitId, queryClient]);

  const expense = expenseQuery.data;
  const {
    participantOptions,
    fromParticipantId,
    toParticipantId,
    amountInput,
    canSettleExpense,
    canSubmitSettlement,
    isPending: isSettlingExpense,
    setFromParticipantId,
    setToParticipantId,
    setAmountInput,
    settleExpense,
  } = useSettleQuickSplitDebt({
    quickSplitId,
    expenseId,
    expense,
  });
  const handleBack = () => {
    void navigate({ to: '/expenses/friends' });
  };
  const handleConfirmDelete = async () => {
    try {
      await deleteExpenseMutation.mutateAsync({
        quickSplitId,
        expenseId,
      });
      setShowDeleteDrawer(false);
      toast.success(t.deleted);
      await navigate({ to: '/expenses/friends' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.deleteFailed);
    }
  };
  const fromParticipant = participantOptions.find(
    (participant) => participant.id === fromParticipantId,
  );
  const appendSettlementAmount = (key: string) => {
    setAmountInput((current) => {
      if (key === 'delete') return current.slice(0, -1);
      if ((key === '.' || key === ',') && /[.,]/.test(current)) {
        return current;
      }
      if (current === '0' && key !== '.' && key !== ',') return key;
      return `${current}${key}`;
    });
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl flex-col overflow-x-hidden bg-[#ececec] px-4 pb-8 pt-6">
        <header className="mb-5 grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label={t.back}
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-semibold text-[#0f172a]">
              {t.detailTitle}
            </h1>
          </div>
          <span className="size-9" />
        </header>

        {expenseQuery.isLoading && !fallbackExpense ? (
          <ExpenseDetailSkeleton />
        ) : null}

        {!expenseQuery.isLoading && !expense ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t.missingExpense}
          </div>
        ) : null}

        {expense ? (
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
              <div className="px-5 pb-4 pt-4 text-center">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[#fff1f5] text-primary">
                  <UsersRound className="size-6" />
                </div>
                <h2 className="truncate text-base font-medium text-[#444444]">
                  {expense.description}
                </h2>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-[#202124]">
                  {formatAmount(expense.currency, expense.amount)}
                </p>
                <div className="mt-3 flex justify-center">
                  <span className="inline-flex items-center rounded-full bg-[#fff1f5] px-3 py-1 text-[11px] font-semibold leading-none text-primary">
                    {expense.quickSplitName}
                  </span>
                </div>
                <p className="mt-3 text-xs text-[#202124]">
                  <span>{formatDate(expense.createdAt)}</span>
                  <span className="mx-1 text-[#9ca3af]">•</span>
                  <span className="font-semibold">{expense.paidBy.name}</span>
                </p>
              </div>

              <div className="relative border-t border-dashed border-[#e2e8f0] px-5 pb-6 pt-5 before:absolute before:-left-3 before:-top-3 before:size-6 before:rounded-full before:bg-[#ececec] after:absolute after:-right-3 after:-top-3 after:size-6 after:rounded-full after:bg-[#ececec]">
                <p className="mb-4 text-xs font-medium text-[#444444]">
                  {t.payerLabel}
                </p>
                <div className="space-y-4">
                  <MemberLine
                    image={expense.paidBy.image}
                    name={`${expense.paidBy.name}${expense.paidBy.userId === user?.id ? ` (${t.you})` : ''}`}
                    amount={formatAmount(expense.currency, expense.amount)}
                  />
                </div>

                <p className="mb-4 mt-7 text-xs font-medium text-[#444444]">
                  {t.splitLabel}
                </p>
                <div className="space-y-5">
                  {expense.participants.map((participant) => {
                    const settlements = expense.settlements.filter(
                      (settlement) => settlement.from.id === participant.id,
                    );

                    return (
                      <MemberLine
                        key={participant.id}
                        image={participant.image}
                        name={`${participant.name}${participant.userId === user?.id ? ` (${t.you})` : ''}`}
                        amount={formatAmount(
                          expense.currency,
                          participant.share,
                        )}
                        settlements={settlements}
                        settlementLabel={(settlement) =>
                          t.settlementPaid(
                            settlement.from.name,
                            settlement.to.name,
                          )
                        }
                        showMoreLabel={t.settlementsShowMore}
                        showLessLabel={t.settlementsShowLess}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto flex items-center gap-3 px-5 pb-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowDeleteDrawer(true)}
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#202124] shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
                  aria-label={t.deleteExpenseTitle}
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: '/expenses/quick-split',
                      search: {
                        friendIds: [],
                        quickSplitId,
                        expenseId,
                      },
                    })
                  }
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#202124] shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
                  aria-label={t.editExpense}
                >
                  <PencilLine className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettleDrawer(true)}
                  disabled={!canSettleExpense}
                  className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#080202] text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t.settleExpense}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <Drawer open={showDeleteDrawer} onOpenChange={setShowDeleteDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.deleteExpenseTitle}</DrawerTitle>
            <DrawerDescription>{t.deleteExpenseCopy}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="grid grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => setShowDeleteDrawer(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending
                ? t.common.deleting
                : t.common.delete}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={showSettleDrawer} onOpenChange={setShowSettleDrawer}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:!mt-0 data-[vaul-drawer-direction=bottom]:!max-h-dvh data-[vaul-drawer-direction=bottom]:!rounded-t-none flex !h-dvh !max-h-dvh flex-col overflow-hidden rounded-none border-0 bg-[#fafafa]">
          <DrawerHeader className="shrink-0 border-b border-[#e5e7eb] bg-white px-4 pb-3 pt-5 text-left">
            <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
              <button
                type="button"
                onClick={() => setShowSettleDrawer(false)}
                className="flex size-9 items-center justify-center rounded-full border border-[#e5e7eb] text-[#202124]"
                aria-label={t.back}
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="text-center">
                <p className="text-xs text-[#737373]">{t.step}</p>
                <DrawerTitle className="text-sm text-[#202124]">
                  {t.settleExpenseTitle}
                </DrawerTitle>
              </div>
              <span aria-hidden="true" />
            </div>
            <DrawerDescription className="sr-only">
              {t.settleExpenseCopy}
            </DrawerDescription>
          </DrawerHeader>
          <div className="h-2 shrink-0 bg-[#eeeeee]">
            <div className="h-full w-1/4 rounded-r-full bg-primary" />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-4 py-8">
            <div className="mx-auto flex w-full max-w-md flex-col">
              <div className="flex items-end justify-between gap-4">
                <button
                  type="button"
                  className="flex items-center gap-2 pb-1 text-[2.1rem] font-medium leading-none text-[#202124]"
                >
                  <span>{expense?.currency ?? 'COP'}</span>
                  <ChevronDown className="size-4" />
                </button>
                <p className="text-[2.1rem] font-medium leading-none tracking-tight text-[#202124]">
                  ${formatSettlementAmount(amountInput)}
                </p>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[#737373]">
                <span className="size-3 rounded-full bg-[linear-gradient(to_bottom,_#fcd116_0_33%,_#003893_33%_66%,_#ce1126_66%_100%)]" />
                {t.settleCurrencyName}
              </p>

              <div className="mt-7 flex items-center rounded-2xl border border-[#ededed] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#737373]">{t.payerLabel}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-[#202124]">
                    {fromParticipant?.name ?? ''}
                  </p>
                </div>
                <SettlementParticipantSelect
                  ariaLabel={t.settleFromLabel}
                  expense={expense}
                  participants={participantOptions}
                  selectedId={fromParticipantId}
                  onValueChange={setFromParticipantId}
                />
                <ArrowRight className="mx-3 size-4 text-[#737373]" />
                <SettlementParticipantSelect
                  ariaLabel={t.settleToLabel}
                  expense={expense}
                  participants={participantOptions}
                  selectedId={toParticipantId}
                  onValueChange={setToParticipantId}
                />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => appendSettlementAmount(key)}
                      className="flex aspect-square items-center justify-center rounded-2xl border border-[#ededed] bg-white text-4xl font-medium text-[#202124]"
                    >
                      {key}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => appendSettlementAmount('delete')}
                  className="flex aspect-square items-center justify-center rounded-2xl border border-[#ededed] bg-white text-[#202124]"
                  aria-label={t.common.delete}
                >
                  <Delete className="size-7" />
                </button>
              </div>
            </div>
          </div>
          <DrawerFooter className="shrink-0 bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
            <Button
              type="button"
              className="h-11 rounded-full bg-primary text-sm font-semibold text-white"
              onClick={() =>
                void settleExpense().then(() => setShowSettleDrawer(false))
              }
              disabled={!canSubmitSettlement || isSettlingExpense}
            >
              {isSettlingExpense ? t.settleExpensePending : t.settleExpense}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function getSettlementParticipantImage(
  expense: QuickSplitExpenseDetail | undefined,
  participantId: string,
) {
  if (!expense) return null;
  if (expense.paidBy.id === participantId) return expense.paidBy.image;
  return (
    expense.participants.find((participant) => participant.id === participantId)
      ?.image ?? null
  );
}

function SettlementAvatar({
  image,
  name,
}: {
  image: string | null;
  name: string;
}) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eeeeee] text-sm font-medium text-[#555555]">
      {image ? (
        <img
          src={image}
          alt={name}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

function SettlementParticipantSelect({
  ariaLabel,
  expense,
  participants,
  selectedId,
  onValueChange,
}: {
  ariaLabel: string;
  expense: QuickSplitExpenseDetail | undefined;
  participants: Array<{
    id: string;
    name: string;
  }>;
  selectedId: string;
  onValueChange: (participantId: string) => void;
}) {
  const selectedParticipant = participants.find(
    (participant) => participant.id === selectedId,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label={ariaLabel}
      >
        <SettlementAvatar
          image={getSettlementParticipantImage(expense, selectedId)}
          name={selectedParticipant?.name ?? ''}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={selectedId}
            onValueChange={onValueChange}
          >
            {participants.map((participant) => (
              <DropdownMenuRadioItem
                key={participant.id}
                value={participant.id}
              >
                <SettlementAvatar
                  image={getSettlementParticipantImage(expense, participant.id)}
                  name={participant.name}
                />
                <span className="truncate">{participant.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MemberLine({
  image,
  name,
  amount,
  settlements,
  settlementLabel,
  showMoreLabel,
  showLessLabel,
}: {
  image: string | null;
  name: string;
  amount?: string;
  settlements?: Settlement[];
  settlementLabel?: (settlement: Settlement) => string;
  showMoreLabel?: (count: number) => string;
  showLessLabel?: string;
}) {
  const [showAllSettlements, setShowAllSettlements] = useState(false);
  const visibleSettlements = showAllSettlements
    ? settlements
    : settlements?.slice(0, 2);
  const remainingSettlements = Math.max(0, (settlements?.length ?? 0) - 2);

  return (
    <div>
      <div className="flex items-center gap-3">
        {image ? (
          <img
            src={image}
            alt={name}
            className="size-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-[#eeeeee] text-sm font-medium text-[#555555]">
            {getInitials(name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[#202124]">
            {name}
          </span>
        </div>
        {amount ? (
          <span className="shrink-0 text-sm font-semibold text-[#202124]">
            {amount}
          </span>
        ) : null}
      </div>

      {visibleSettlements?.length ? (
        <div className="ml-12 mt-3 space-y-2 border-l border-[#e5e7eb] pl-3">
          {visibleSettlements.map((settlement) => (
            <div
              key={settlement.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#f8f8f8] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[#202124]">
                  {settlementLabel?.(settlement)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#737373]">
                  {formatDate(settlement.createdAt)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#202124]">
                {formatAmount(settlement.currency, settlement.amount)}
              </span>
            </div>
          ))}
          {remainingSettlements > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllSettlements((current) => !current)}
              className="flex w-full items-center justify-center gap-2 pt-1 text-xs font-medium text-[#202124]"
            >
              {showAllSettlements
                ? showLessLabel
                : showMoreLabel?.(remainingSettlements)}
              {showAllSettlements ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ExpenseDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="rounded-[32px] border border-white bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
        <div className="mx-auto mb-4 size-16 rounded-[26px] bg-[#e5e7eb]" />
        <div className="mx-auto h-4 w-28 rounded-full bg-[#e5e7eb]" />
        <div className="mx-auto mt-3 h-7 w-44 rounded-full bg-[#e5e7eb]" />
        <div className="mx-auto mt-3 h-9 w-36 rounded-full bg-[#e5e7eb]" />
      </div>
      <div className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white px-4 py-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-[#f1f5f9] py-3 last:border-b-0"
          >
            <div className="size-9 rounded-full bg-[#f1f5f9]" />
            <div className="h-4 flex-1 rounded-full bg-[#f1f5f9]" />
            <div className="h-4 w-20 rounded-full bg-[#f1f5f9]" />
          </div>
        ))}
      </div>
    </div>
  );
}
