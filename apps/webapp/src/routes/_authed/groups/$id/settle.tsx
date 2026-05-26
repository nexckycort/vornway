import { createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, Delete, Repeat2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import {
  useSettleDebtMutation,
  useUpdateExpenseMutation,
} from '#/routes/_authed/groups/-hooks/use-group-actions';
import {
  useGroupExpenseQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';

export const Route = createFileRoute('/_authed/groups/$id/settle')({
  validateSearch: (search: Record<string, unknown>) => ({
    settlementExpenseId:
      typeof search.settlementExpenseId === 'string' &&
      search.settlementExpenseId.trim().length > 0
        ? search.settlementExpenseId
        : undefined,
  }),
  component: RouteComponent,
});

const currencyMeta: Record<
  string,
  { flag: string; label: string; symbol: string }
> = {
  COP: { flag: '🇨🇴', label: 'Pesos Colombianos', symbol: '$' },
  EUR: { flag: '🇪🇺', label: 'Euro', symbol: '€' },
  USD: { flag: '🇺🇸', label: 'Dólar estadounidense', symbol: 'US$' },
  GBP: { flag: '🇬🇧', label: 'Libra esterlina', symbol: '£' },
  MXN: { flag: '🇲🇽', label: 'Peso mexicano', symbol: '$' },
  BRL: { flag: '🇧🇷', label: 'Real brasileño', symbol: 'R$' },
};

type Step = 1 | 2;

function formatCompactAmount(currency: string, amount: number) {
  const hasDecimals = Math.abs(amount % 1) > 0.000001;

  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('es-CO', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })} ${currency}`;
  }
}

function formatAmountInput(currency: string, digits: string) {
  const normalizedDigits = digits.includes(',') ? digits : `${digits},00`;
  const [integerPart, decimalPart = '00'] = normalizedDigits.split(',');
  const amount = parseEditableAmount(normalizedDigits);
  const formattedAmount = formatCompactAmount(currency, amount);
  const safeIntegerPart = integerPart || '0';
  const safeDecimalPart = decimalPart.padEnd(2, '0').slice(0, 2);

  try {
    const formattedInteger = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.parseInt(safeIntegerPart, 10) || 0);

    return `${formattedInteger},${safeDecimalPart}`;
  } catch {
    void formattedAmount;
    return `${safeIntegerPart},${safeDecimalPart} ${currency}`;
  }
}

function formatEditableAmount(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace('.', ',');
}

function parseEditableAmount(value: string) {
  return Number.parseFloat(value.replace(',', '.')) || 0;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function RouteComponent() {
  const { id } = Route.useParams();
  const { settlementExpenseId } = Route.useSearch();
  const t = getGroupDetailMessages();
  const { navigateToGroupRoot } = useGroupFlowNavigation(id);
  const groupQuery = useGroupSummaryQuery(id);
  const settleMutation = useSettleDebtMutation(id);
  const updateSettlementMutation = useUpdateExpenseMutation(
    id,
    settlementExpenseId ?? '',
  );
  const settlementExpenseQuery = useGroupExpenseQuery(
    id,
    settlementExpenseId ?? '',
  );

  const [step, setStep] = useState<Step>(1);
  const [selectedKey, setSelectedKey] = useState('');
  const [amountDigits, setAmountDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasStepTwoHistoryRef = useRef(false);
  const closingStepTwoFromPopStateRef = useRef(false);
  const didInitializeEditRef = useRef(false);

  const options = useMemo(
    () =>
      (groupQuery.data?.settlementDebts ?? []).map((debt) => ({
        key: `${debt.fromMemberId}:${debt.toMemberId}:${debt.currency}`,
        ...debt,
      })),
    [groupQuery.data?.settlementDebts],
  );

  const membersById = useMemo(
    () =>
      new Map(
        (groupQuery.data?.members ?? []).map((member) => [member.id, member]),
      ),
    [groupQuery.data?.members],
  );

  const myMembershipId = groupQuery.data?.myMembership?.id ?? null;

  const debtsIOwe = useMemo(
    () =>
      options.filter(
        (option) =>
          (myMembershipId ? option.fromMemberId === myMembershipId : false) &&
          option.amount > 0,
      ),
    [myMembershipId, options],
  );

  const debtsOwedToMe = useMemo(
    () =>
      options.filter(
        (option) =>
          (myMembershipId ? option.toMemberId === myMembershipId : false) &&
          option.amount > 0,
      ),
    [myMembershipId, options],
  );

  const editableSettlementOption = useMemo(() => {
    const expense = settlementExpenseQuery.data;
    if (!settlementExpenseId || !expense?.isSettlement) return null;

    const toMemberId = expense.participants[0]?.memberId;
    const toName = expense.participants[0]?.name;
    if (!toMemberId || !toName) return null;

    const key = `${expense.paidBy.id}:${toMemberId}:${expense.currency}`;
    const pendingDebt =
      options.find((option) => option.key === key)?.amount ?? 0;

    return {
      key,
      fromMemberId: expense.paidBy.id,
      fromName: expense.paidBy.name,
      toMemberId,
      toName,
      currency: expense.currency,
      amount: pendingDebt + expense.amount,
    };
  }, [options, settlementExpenseId, settlementExpenseQuery.data]);

  useEffect(() => {
    if (settlementExpenseId) return;

    if (!selectedKey && options[0]) {
      setSelectedKey(options[0].key);
      setAmountDigits(formatEditableAmount(options[0].amount));
    }
  }, [options, selectedKey, settlementExpenseId]);

  useEffect(() => {
    if (!settlementExpenseId || didInitializeEditRef.current) return;
    const expense = settlementExpenseQuery.data;
    if (!expense?.isSettlement) return;

    const toMemberId = expense.participants[0]?.memberId;
    if (!toMemberId) return;

    const key = `${expense.paidBy.id}:${toMemberId}:${expense.currency}`;
    setSelectedKey(key);
    setAmountDigits(formatEditableAmount(expense.amount));
    setStep(2);
    setError(null);
    didInitializeEditRef.current = true;
  }, [settlementExpenseId, settlementExpenseQuery.data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (step === 2 && !hasStepTwoHistoryRef.current) {
      window.history.pushState(
        {
          ...(window.history.state ?? {}),
          settleStepTwo: true,
        },
        '',
      );
      hasStepTwoHistoryRef.current = true;
      closingStepTwoFromPopStateRef.current = false;
      return;
    }

    if (
      step === 1 &&
      hasStepTwoHistoryRef.current &&
      !closingStepTwoFromPopStateRef.current
    ) {
      hasStepTwoHistoryRef.current = false;
      window.history.back();
    }

    if (step === 1) {
      closingStepTwoFromPopStateRef.current = false;
    }
  }, [step]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      if (step === 2) {
        closingStepTwoFromPopStateRef.current = true;
        hasStepTwoHistoryRef.current = false;
        setStep(1);
        setError(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [step]);

  const selected =
    options.find((option) => option.key === selectedKey) ??
    (editableSettlementOption?.key === selectedKey
      ? editableSettlementOption
      : null);
  const isEditingSettlement = Boolean(settlementExpenseId);
  const selectedCounterpart = selected
    ? selected.fromMemberId === myMembershipId
      ? (membersById.get(selected.toMemberId) ?? null)
      : (membersById.get(selected.fromMemberId) ?? null)
    : null;
  const selectedCurrency =
    (selected && currencyMeta[selected.currency]) || currencyMeta.COP;
  const parsedAmount = parseEditableAmount(amountDigits);
  const maxAmount = selected ? selected.amount : 0;
  const canSubmit =
    Boolean(selected) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= maxAmount + 0.000001;

  const progressWidth = step === 1 ? '50%' : '100%';

  const goBack = async () => {
    if (step === 2) {
      setStep(1);
      setError(null);
      return;
    }

    await navigateToGroupRoot(true);
  };

  const selectDebt = (key: string) => {
    const next = options.find((option) => option.key === key);
    if (!next) return;
    setSelectedKey(key);
    setAmountDigits(formatEditableAmount(next.amount));
    setError(null);
    setStep(2);
  };

  const appendDigits = (next: string) => {
    if (
      !selected ||
      settleMutation.isPending ||
      updateSettlementMutation.isPending
    ) {
      return;
    }

    if (next === ',') {
      if (amountDigits.includes(',')) return;
      setAmountDigits((current) => `${current || '0'},`);
      return;
    }

    const fractionalPart = amountDigits.split(',')[1] ?? '';
    if (amountDigits.includes(',') && fractionalPart.length >= 2) return;

    const candidate =
      amountDigits === '0'
        ? next.replace(/^0+(?=\d)/, '')
        : `${amountDigits}${next}`;
    const normalized = candidate.replace(/^0+(?=\d)/, '') || '0';
    const numericValue = parseEditableAmount(normalized);

    if (numericValue > maxAmount) {
      setAmountDigits(formatEditableAmount(maxAmount));
      return;
    }

    setAmountDigits(normalized);
  };

  const deleteDigit = () => {
    if (settleMutation.isPending || updateSettlementMutation.isPending) return;
    setAmountDigits((current) => current.slice(0, -1) || '0');
  };

  const submit = async () => {
    if (
      !selected ||
      !canSubmit ||
      settleMutation.isPending ||
      updateSettlementMutation.isPending
    ) {
      return;
    }
    setError(null);

    try {
      if (isEditingSettlement && settlementExpenseId) {
        await updateSettlementMutation.mutateAsync({
          description: `Liquidación: ${selected.fromName} -> ${selected.toName}`,
          amount: parsedAmount,
          currency: selected.currency,
          paidById: selected.fromMemberId,
          participantIds: [selected.toMemberId],
          splitMethod: 'exact',
          exactShares: {
            [selected.toMemberId]: parsedAmount,
          },
        });
      } else {
        await settleMutation.mutateAsync({
          fromMemberId: selected.fromMemberId,
          toMemberId: selected.toMemberId,
          amount: parsedAmount,
          currency: selected.currency,
        });
      }
      await navigateToGroupRoot(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditingSettlement
            ? t.settle.updateSettlementFailed
            : t.settle.settleFailed,
      );
    }
  };

  if (
    groupQuery.isLoading ||
    (isEditingSettlement && settlementExpenseQuery.isLoading)
  ) {
    return (
      <main className="min-h-dvh bg-white">
        <div className="flex min-h-dvh items-center justify-center px-6 text-sm text-[#64748b]">
          {isEditingSettlement
            ? t.settle.loadingSettlement
            : t.settle.loadingDebts}
        </div>
      </main>
    );
  }

  if (
    groupQuery.isError ||
    !groupQuery.data ||
    (isEditingSettlement &&
      (settlementExpenseQuery.isError ||
        !settlementExpenseQuery.data ||
        !settlementExpenseQuery.data.isSettlement))
  ) {
    return (
      <main className="min-h-dvh bg-white">
        <div className="flex min-h-dvh flex-col justify-center gap-4 px-6">
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupQuery.error instanceof Error
              ? groupQuery.error.message
              : settlementExpenseQuery.error instanceof Error
                ? settlementExpenseQuery.error.message
                : isEditingSettlement
                  ? t.settle.loadSettlementError
                  : t.settle.loadGroupError}
          </div>
          <button
            type="button"
            onClick={() => {
              void navigateToGroupRoot(true);
            }}
            className="h-12 rounded-full border border-[#e2e8f0] bg-white text-sm font-medium text-[#132238]"
          >
            {t.common.back}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white text-[#132238]">
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-[#eef2f7] bg-white">
          <div className="flex items-center justify-between px-4 pb-3 pt-6">
            <button
              type="button"
              onClick={() => {
                void goBack();
              }}
              className="flex size-9 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#334155]"
              aria-label={t.common.back}
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="text-center">
              <p className="text-[11px] font-medium text-[#94a3b8]">
                {t.settle.stepOf(step, 2)}
              </p>
              <h1 className="text-base font-semibold text-[#111827]">
                {t.settle.title}
              </h1>
            </div>

            <div className="size-9" />
          </div>

          <div className="h-1 bg-[#f1f5f9]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: progressWidth }}
            />
          </div>
        </header>

        {options.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center px-4">
            <div className="rounded-[28px] border border-[#e2e8f0] bg-white px-5 py-8 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <h2 className="text-base font-semibold text-[#132238]">
                {t.settle.noDebtsTitle}
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">
                {t.settle.noDebtsCopy}
              </p>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="flex flex-1 flex-col px-4 pb-6 pt-4">
            <DebtSection
              title={t.settle.oweOthers}
              items={debtsIOwe}
              membersById={membersById}
              myMembershipId={myMembershipId}
              onSelect={selectDebt}
            />

            <DebtSection
              title={t.settle.owedToYou}
              items={debtsOwedToMe}
              membersById={membersById}
              myMembershipId={myMembershipId}
              onSelect={selectDebt}
              className="mt-5"
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[34px] font-light leading-none text-[#1f2937]"
                      onClick={() => setStep(1)}
                    >
                      <span>{selected.currency}</span>
                      <ChevronDown className="mt-1 size-4 text-[#64748b]" />
                    </button>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-[#94a3b8]">
                      <span>{selectedCurrency.flag}</span>
                      <span>{selectedCurrency.label}</span>
                    </div>
                  </div>

                  <p className="pt-1 text-[34px] font-light leading-none text-[#1f2937]">
                    {formatAmountInput(selected.currency, amountDigits)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mt-6 flex items-center justify-between rounded-[22px] border border-[#e8edf3] bg-white px-4 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex items-center gap-3">
                    <AvatarCircle
                      name={selectedCounterpart?.name ?? 'Participante'}
                      image={selectedCounterpart?.image ?? null}
                      size="md"
                    />
                    <div>
                      <p className="text-[11px] text-[#94a3b8]">
                        {t.settle.counterpartLabel}
                      </p>
                      <p className="text-sm font-semibold text-[#111827]">
                        {selectedCounterpart?.name ?? 'Participante'}
                      </p>
                    </div>
                  </div>
                  <span className="flex size-8 items-center justify-center rounded-full text-[#94a3b8]">
                    <Repeat2 className="size-4" />
                  </span>
                </button>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
                    (digit) => (
                      <KeypadButton
                        key={digit}
                        label={digit}
                        onClick={() => appendDigits(digit)}
                      />
                    ),
                  )}
                  <KeypadButton
                    label="0"
                    onClick={() => appendDigits('0')}
                    borderless
                  />
                  <KeypadButton label="," onClick={() => appendDigits(',')} />
                  <KeypadButton
                    label={<Delete className="size-5" />}
                    onClick={deleteDigit}
                    borderless
                  />
                </div>

                {error ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    void submit();
                  }}
                  disabled={!canSubmit || settleMutation.isPending}
                  className="mt-8 h-14 rounded-full bg-primary text-base font-semibold text-white transition-opacity disabled:opacity-50"
                >
                  {isEditingSettlement
                    ? updateSettlementMutation.isPending
                      ? t.settle.saving
                      : t.settle.save
                    : settleMutation.isPending
                      ? t.settle.settling
                      : t.settle.settle}
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function DebtSection({
  title,
  items,
  membersById,
  myMembershipId,
  onSelect,
  className = '',
}: {
  title: string;
  items: Array<{
    key: string;
    fromMemberId: string;
    fromName: string;
    toMemberId: string;
    toName: string;
    currency: string;
    amount: number;
  }>;
  membersById: Map<
    string,
    {
      id: string;
      name: string;
      email: string | null;
      image: string | null;
      role: string;
      userId: string | null;
      isCurrentUser: boolean;
      expenseCount: number;
    }
  >;
  myMembershipId: string | null;
  onSelect: (key: string) => void;
  className?: string;
}) {
  const t = getGroupDetailMessages();
  if (items.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="mb-3 text-xl font-medium leading-none text-[#1f2937]">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((item) => {
          const counterpartId =
            item.fromMemberId === myMembershipId
              ? item.toMemberId
              : item.fromMemberId;
          const counterpart = membersById.get(counterpartId) ?? {
            name:
              item.fromMemberId === myMembershipId
                ? item.toName
                : item.fromName,
            image: null,
          };
          const isDebtToMe = item.toMemberId === myMembershipId;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex w-full items-center gap-3 rounded-[22px] border border-[#e8edf3] bg-white px-3 py-3 text-left shadow-[0_10px_20px_rgba(15,23,42,0.03)]"
            >
              <AvatarCircle
                name={counterpart.name}
                image={counterpart.image}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-[#111827]">
                  {counterpart.name}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    isDebtToMe ? 'text-[#10b981]' : 'text-[#ef4444]'
                  }`}
                >
                  {isDebtToMe
                    ? t.settle.owesYou(
                        formatCompactAmount(item.currency, item.amount),
                      )
                    : t.settle.youOwe(
                        formatCompactAmount(item.currency, item.amount),
                      )}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AvatarCircle({
  name,
  image,
  size,
}: {
  name: string;
  image: string | null;
  size: 'md';
}) {
  const sizeClass = size === 'md' ? 'size-12' : 'size-10';

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-lg font-medium text-[#374151]`}
    >
      {initialsFromName(name)}
    </div>
  );
}

function KeypadButton({
  label,
  onClick,
  borderless = false,
}: {
  label: React.ReactNode;
  onClick: () => void;
  borderless?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[104px] items-center justify-center rounded-[18px] bg-white text-[24px] font-light text-[#1f2937] transition-transform active:scale-[0.98] ${
        borderless
          ? ''
          : 'border border-[#edf1f5] shadow-[0_8px_18px_rgba(15,23,42,0.03)]'
      }`}
    >
      {label}
    </button>
  );
}
