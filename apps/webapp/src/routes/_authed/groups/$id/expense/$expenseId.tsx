import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, HandCoins, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { useDeleteExpenseMutation } from '#/routes/_authed/groups/-hooks/use-delete-expense';
import {
  useGroupExpenseQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import { CategoryIcon } from '../-components/category-icon';
import { getExpenseEmoji } from '../-components/group-detail.utils';
import type { ExpenseItem, GroupSummary } from '../-types/group-detail.types';
import { getExpenseLineItemsMessages } from '../add-expense/-line-items-messages';

export const Route = createFileRoute('/_authed/groups/$id/expense/$expenseId')({
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

type ExpenseParticipant = {
  memberId: string;
  name: string;
  share: number;
};

type ExpenseLineItem = NonNullable<ExpenseItem['lineItems']>[number];

function groupLineItemsByMember(lineItems: ExpenseLineItem[]) {
  const grouped = new Map<string, ExpenseLineItem[]>();

  for (const item of lineItems) {
    const memberItems = grouped.get(item.memberId) ?? [];
    memberItems.push(item);
    grouped.set(item.memberId, memberItems);
  }

  return grouped;
}

function normalizeExpense(
  candidate: unknown,
  fallback: ExpenseItem | null,
): (ExpenseItem & { participants: ExpenseParticipant[] }) | null {
  const fallbackWithParticipants = fallback
    ? { ...fallback, participants: [] }
    : null;

  if (!candidate || typeof candidate !== 'object') {
    return fallbackWithParticipants;
  }

  const expense = candidate as Partial<ExpenseItem> & {
    participants?: ExpenseParticipant[];
  };

  if (
    !expense.id ||
    !expense.description ||
    typeof expense.amount !== 'number' ||
    !expense.currency ||
    !expense.date ||
    !expense.paidBy
  ) {
    return fallbackWithParticipants;
  }

  return {
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    date: expense.date,
    isDeleted: expense.isDeleted ?? fallback?.isDeleted ?? false,
    isSettlement: expense.isSettlement ?? fallback?.isSettlement ?? false,
    isPersonal: expense.isPersonal ?? fallback?.isPersonal ?? false,
    expenseType: expense.expenseType ?? fallback?.expenseType ?? 'standard',
    subExpenseCount: expense.subExpenseCount ?? fallback?.subExpenseCount ?? 0,
    settlementToName:
      expense.settlementToName ?? fallback?.settlementToName ?? null,
    paidBy: expense.paidBy,
    paidByMembers: expense.paidByMembers ?? fallback?.paidByMembers ?? [],
    attachmentUrl: expense.attachmentUrl ?? fallback?.attachmentUrl ?? null,
    advancedDetails:
      expense.advancedDetails ?? fallback?.advancedDetails ?? null,
    lineItems: expense.lineItems ?? fallback?.lineItems ?? [],
    sharedSplit: expense.sharedSplit ?? fallback?.sharedSplit ?? null,
    participantCount:
      expense.participantCount ??
      expense.participants?.length ??
      fallback?.participantCount ??
      0,
    category: expense.category ?? fallback?.category ?? null,
    currentUserBalance:
      expense.currentUserBalance ?? fallback?.currentUserBalance ?? null,
    syncStatus: fallback?.syncStatus,
    participants: expense.participants ?? [],
  };
}

function getMemberMeta(
  memberId: string,
  members: GroupSummary['members'] | undefined,
) {
  return members?.find((member) => member.id === memberId) ?? null;
}

function getSharedParticipantAmount(input: {
  sharedSplit: ExpenseItem['sharedSplit'];
  participantId: string;
  participantTotalShare: number;
  participantCount: number;
}) {
  const {
    sharedSplit,
    participantId,
    participantTotalShare,
    participantCount,
  } = input;
  if (!sharedSplit || sharedSplit.amount <= 0 || participantCount <= 0) {
    return {
      directAmount: participantTotalShare,
      sharedAmount: 0,
    };
  }

  const equalSharedAmount = sharedSplit.amount / participantCount;

  if (sharedSplit.splitMethod === 'exact') {
    return {
      directAmount: sharedSplit.splitValues?.[participantId] ?? 0,
      sharedAmount: equalSharedAmount,
    };
  }

  if (sharedSplit.splitMethod === 'percentage') {
    const percentage = sharedSplit.splitValues?.[participantId];
    if (typeof percentage === 'number') {
      const baseAmount = Math.max(participantTotalShare - equalSharedAmount, 0);
      const estimatedDirectFromPercentage =
        percentage >= 0 && percentage <= 100
          ? baseAmount
          : participantTotalShare;

      return {
        directAmount: estimatedDirectFromPercentage,
        sharedAmount: equalSharedAmount,
      };
    }
  }

  return {
    directAmount: Math.max(participantTotalShare - equalSharedAmount, 0),
    sharedAmount: equalSharedAmount,
  };
}

function RouteComponent() {
  const t = getGroupDetailMessages();
  const { id, expenseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { flowState, navigateToGroupRoot } = useGroupFlowNavigation(id);
  const groupSummaryQuery = useGroupSummaryQuery(id);
  const expenseQuery = useGroupExpenseQuery(id, expenseId);
  const deleteExpenseMutation = useDeleteExpenseMutation(id);
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);
  const lineItemsMessages = getExpenseLineItemsMessages();

  const fallbackExpense = useMemo(() => {
    const cachedExpenses = queryClient.getQueryData<{
      pages?: Array<{ data?: ExpenseItem[] }>;
    }>(['group-expenses', id]);
    const items =
      cachedExpenses?.pages?.flatMap((page) => page.data ?? []) ?? [];
    return items.find((item) => item.id === expenseId) ?? null;
  }, [expenseId, id, queryClient]);
  const expense = useMemo(
    () => normalizeExpense(expenseQuery.data, fallbackExpense),
    [expenseQuery.data, fallbackExpense],
  );

  const isSettlement = expense?.isSettlement ?? false;
  const paidByMembers = expense?.paidByMembers ?? [];
  const participants = expense?.participants ?? [];
  const advancedDetails = expense?.advancedDetails ?? null;
  const sharedSplit = expense?.sharedSplit ?? null;
  const lineItems = expense?.lineItems ?? [];
  const lineItemsByMember = groupLineItemsByMember(lineItems);
  const sharedSplitItems = sharedSplit?.items ?? [];
  const sharedSplitAmount = sharedSplit?.amount ?? 0;
  const attachmentUrl = expense?.attachmentUrl ?? null;
  const categoryLabel = expense?.category?.name ?? null;
  const categoryColor = expense?.category?.color ?? '#0f766e';
  const categoryChipStyle = expense?.category?.color
    ? {
        backgroundColor: `${expense.category.color}1a`,
        color: categoryColor,
      }
    : undefined;
  const mapEmbedUrl =
    advancedDetails?.mapEmbedUrl ??
    getGoogleMapsEmbedUrl(advancedDetails?.mapUrl ?? null);

  const handleBack = () => {
    void navigateToGroupRoot(true);
  };

  const handleEditExpense = () => {
    if (!expense) return;

    if (isSettlement) {
      void navigate({
        to: '/groups/$id/settle',
        params: { id },
        search: { settlementExpenseId: expense.id },
        state: flowState,
      });
      return;
    }

    void navigate({
      to: '/groups/$id/add-expense',
      params: { id },
      search: { expenseId: expense.id },
      state: flowState,
    });
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expense) return;

    await deleteExpenseMutation.mutateAsync({
      groupId: id,
      expenseId: expense.id,
    });
    setShowDeleteDrawer(false);
    void navigateToGroupRoot(true);
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl flex-col overflow-x-hidden bg-[#ececec] px-4 pb-8 pt-6">
        <header className="mb-5 grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label={t.expense.backAria}
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-semibold text-[#0f172a]">
              {t.detail.expenseDetailTitle}
            </h1>
          </div>
          <span className="size-9" />
        </header>

        {expenseQuery.isLoading && !fallbackExpense ? (
          <ExpenseDetailSkeleton />
        ) : null}

        {!expenseQuery.isLoading && !fallbackExpense && !expense ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t.detail.expenseMissing}
          </div>
        ) : null}

        {expense ? (
          <section className="flex flex-1 min-w-0 flex-col">
            <div className="relative flex flex-1 min-w-0 flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
              <div className="px-5 pb-4 pt-4 text-center">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  {isSettlement ? (
                    <HandCoins className="size-6" />
                  ) : (
                    <CategoryIcon
                      icon={expense.category?.icon}
                      color={expense.category?.color}
                      fallback={
                        <span className="text-2xl">
                          {getExpenseEmoji(expense)}
                        </span>
                      }
                    />
                  )}
                </div>
                <h2 className="truncate text-base font-medium text-[#444444]">
                  {expense.description}
                </h2>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-[#202124]">
                  {formatAmount(expense.currency, expense.amount)}
                </p>
                {!isSettlement && categoryLabel ? (
                  <div className="mt-3 flex justify-center">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold leading-none"
                      style={categoryChipStyle}
                    >
                      <CategoryIcon
                        icon={expense.category?.icon}
                        color={categoryColor}
                        className="size-3.5"
                        fallback={<span className="text-[10px]">•</span>}
                      />
                      {categoryLabel}
                    </span>
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-[#202124]">
                  <span>{formatDate(expense.date)}</span>
                  <span className="mx-1 text-[#9ca3af]">•</span>
                  <span className="font-semibold">
                    {paidByMembers.length > 1
                      ? t.detail.peoplePaid(paidByMembers.length)
                      : expense.paidBy.name}
                  </span>
                </p>
              </div>

              <div className="relative border-t border-dashed border-[#e2e8f0] px-5 pb-6 pt-5 before:absolute before:-left-3 before:-top-3 before:size-6 before:rounded-full before:bg-[#ececec] after:absolute after:-right-3 after:-top-3 after:size-6 after:rounded-full after:bg-[#ececec]">
                <p className="mb-4 text-xs font-medium text-[#444444]">
                  {t.expense.paidBy}
                </p>
                <div className="space-y-4">
                  {(paidByMembers.length > 0
                    ? paidByMembers
                    : [
                        {
                          memberId: expense.paidBy.id,
                          name: expense.paidBy.name,
                          amount: expense.amount,
                        },
                      ]
                  ).map((payer) => {
                    const member = getMemberMeta(
                      payer.memberId,
                      groupSummaryQuery.data?.members,
                    );

                    return (
                      <MemberLine
                        key={payer.memberId}
                        image={member?.image ?? null}
                        name={`${payer.name}${member?.isCurrentUser ? ` ${t.detail.you}` : ''}`}
                        amount={formatAmount(expense.currency, payer.amount)}
                      />
                    );
                  })}
                </div>

                {!isSettlement ? (
                  <>
                    <p className="mb-4 mt-7 text-xs font-medium text-[#444444]">
                      {t.expense.splitWith}
                    </p>
                    <div className="space-y-5">
                      {participants.map((participant) => {
                        const member = getMemberMeta(
                          participant.memberId,
                          groupSummaryQuery.data?.members,
                        );
                        const {
                          directAmount: directParticipantAmount,
                          sharedAmount: sharedParticipantAmount,
                        } = getSharedParticipantAmount({
                          sharedSplit,
                          participantId: participant.memberId,
                          participantTotalShare: participant.share,
                          participantCount: participants.length,
                        });
                        const participantBreakdown =
                          sharedParticipantAmount > 0
                            ? [
                                `Gasto ${formatAmount(
                                  expense.currency,
                                  directParticipantAmount,
                                )}`,
                                `Compartido ${formatAmount(
                                  expense.currency,
                                  sharedParticipantAmount,
                                )}`,
                              ]
                            : undefined;
                        const participantLineItems =
                          lineItemsByMember.get(participant.memberId) ?? [];

                        return participantLineItems.length > 0 ? (
                          <ParticipantLine
                            key={participant.memberId}
                            image={member?.image ?? null}
                            name={`${participant.name}${member?.isCurrentUser ? ` ${t.detail.you}` : ''}`}
                            amount={formatAmount(
                              expense.currency,
                              participant.share,
                            )}
                            currency={expense.currency}
                            lineItems={participantLineItems}
                            sharedAmount={sharedParticipantAmount}
                            sharedItemLabel={lineItemsMessages.sharedItem}
                          />
                        ) : (
                          <MemberLine
                            key={participant.memberId}
                            image={member?.image ?? null}
                            name={`${participant.name}${member?.isCurrentUser ? ` ${t.detail.you}` : ''}`}
                            amount={formatAmount(
                              expense.currency,
                              participant.share,
                            )}
                            detail={participantBreakdown}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {!isSettlement && sharedSplitItems.length > 0 ? (
                  <>
                    <p className="mb-4 mt-7 text-xs font-medium text-[#444444]">
                      {t.detail.sharedExpenses}
                    </p>
                    <div className="space-y-4 rounded-3xl bg-[#fafafa] p-4">
                      {sharedSplitItems.map((item, index) => (
                        <DetailLine
                          key={`${item.name}-${index}`}
                          label={item.name}
                          value={formatAmount(expense.currency, item.amount)}
                        />
                      ))}
                      <div className="h-px bg-[#e5e7eb]" />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-medium text-[#94a3b8]">
                          {t.detail.sharedTotal}
                        </p>
                        <p className="text-sm font-semibold text-[#202124]">
                          {formatAmount(expense.currency, sharedSplitAmount)}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}

                {advancedDetails ? (
                  <>
                    <p className="mb-4 mt-7 text-xs font-medium text-[#444444]">
                      {t.expense.placeDetailsTitle}
                    </p>
                    <div className="min-w-0 space-y-3 rounded-3xl bg-[#fafafa] p-4">
                      {mapEmbedUrl ? (
                        <div className="max-w-full overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white">
                          <iframe
                            title={t.detail.mapTitle(
                              advancedDetails.placeName ?? expense.description,
                            )}
                            src={mapEmbedUrl}
                            className="block aspect-[4/3] w-full max-w-full"
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      ) : null}

                      <DetailLine
                        label={t.expense.detailLabels.type}
                        value={getAdvancedTypeLabel(advancedDetails.type)}
                      />
                      <DetailLine
                        label={t.expense.detailLabels.place}
                        value={advancedDetails.placeName}
                      />
                      <DetailLine
                        label={t.expense.detailLabels.address}
                        value={advancedDetails.address}
                      />
                      {!mapEmbedUrl ? (
                        <DetailLine
                          label={t.expense.detailLabels.map}
                          value={advancedDetails.mapUrl}
                        />
                      ) : null}
                      <DetailLine
                        label={t.expense.detailLabels.contact}
                        value={advancedDetails.contactName}
                      />
                      <DetailLine
                        label={t.expense.detailLabels.phone}
                        value={advancedDetails.phone}
                      />
                      <DetailLine
                        label={t.expense.detailLabels.email}
                        value={advancedDetails.email}
                      />
                      <DetailLine
                        label={t.expense.detailLabels.reservation}
                        value={advancedDetails.bookingCode}
                      />
                      <DetailLine
                        label={t.expense.detailLabels.dateOrTime}
                        value={advancedDetails.reservationTime}
                      />
                      <DetailLine
                        label={t.expense.detailLabels.link}
                        value={advancedDetails.websiteUrl}
                      />
                      <DetailLine
                        label={t.expense.detailLabels.notes}
                        value={advancedDetails.notes}
                      />
                    </div>
                  </>
                ) : null}

                {attachmentUrl ? (
                  <>
                    <p className="mb-4 mt-7 text-xs font-medium text-[#444444]">
                      Imagen
                    </p>
                    <img
                      src={attachmentUrl}
                      alt={`Imagen de ${expense.description}`}
                      className="block aspect-[4/3] w-full max-w-full rounded-3xl object-cover"
                    />
                  </>
                ) : null}
              </div>

              <div className="mt-auto flex items-center gap-3 px-5 pb-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowDeleteDrawer(true)}
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#202124] shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
                  aria-label={
                    isSettlement
                      ? t.expense.deleteSettlementTitle
                      : t.expense.deleteExpenseTitle
                  }
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleEditExpense}
                  className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#080202] text-sm font-semibold text-white"
                >
                  {isSettlement
                    ? t.expense.editSettlement
                    : t.expense.editExpense}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <Drawer open={showDeleteDrawer} onOpenChange={setShowDeleteDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {isSettlement
                ? t.expense.deleteSettlementTitle
                : t.expense.deleteExpenseTitle}
            </DrawerTitle>
            <DrawerDescription>
              {isSettlement
                ? t.expense.deleteSettlementCopy
                : t.expense.deleteExpenseCopy}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="grid grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => setShowDeleteDrawer(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              onClick={() => void handleConfirmDeleteExpense()}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending
                ? t.detail.deleting
                : t.common.delete}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function MemberLine({
  image,
  name,
  amount,
  detail,
}: {
  image: string | null;
  name: string;
  amount?: string;
  detail?: string[];
}) {
  return (
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
        {detail?.length ? (
          <div className="mt-0.5 space-y-0.5 text-xs leading-4 text-[#64748b]">
            {detail.map((line) => (
              <span
                key={line}
                className="block break-words [overflow-wrap:anywhere]"
              >
                {line}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {amount ? (
        <span className="shrink-0 text-sm font-semibold text-[#202124]">
          {amount}
        </span>
      ) : null}
    </div>
  );
}

function ParticipantLine({
  image,
  name,
  amount,
  currency,
  lineItems,
  sharedAmount,
  sharedItemLabel,
}: {
  image: string | null;
  name: string;
  amount: string;
  currency: string;
  lineItems: ExpenseLineItem[];
  sharedAmount: number;
  sharedItemLabel: string;
}) {
  return (
    <div>
      <MemberLine image={image} name={name} amount={amount} />
      <div className="ml-12 mt-2 flex flex-col gap-2 rounded-2xl bg-[#fafafa] px-4 py-3">
        {lineItems.map((item, index) => (
          <div
            key={`${item.description}-${index}`}
            className="flex items-start justify-between gap-3"
          >
            <span className="min-w-0 flex-1 break-words text-xs text-[#64748b] [overflow-wrap:anywhere]">
              {item.description}
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-[#202124]">
              {formatAmount(currency, item.amount)}
            </span>
          </div>
        ))}
        {sharedAmount > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-[#e5e7eb] pt-2">
            <span className="text-xs text-[#64748b]">{sharedItemLabel}</span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-[#202124]">
              {formatAmount(currency, sharedAmount)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getAdvancedTypeLabel(type: string) {
  switch (type) {
    case 'stay':
      return m['groups.expense.advancedTypeStay']();
    case 'food':
      return m['groups.expense.advancedTypeFood']();
    case 'transport':
      return m['groups.expense.advancedTypeTransport']();
    case 'activity':
      return m['groups.expense.advancedTypeActivity']();
    case 'purchase':
      return m['groups.expense.advancedTypePurchase']();
    default:
      return m['groups.expense.advancedTypeOther']();
  }
}

function getGoogleMapsEmbedUrl(value: string | null | undefined) {
  const rawValue = value?.trim();
  if (!rawValue) return null;

  const iframeSrc = rawValue.match(/\ssrc=["']([^"']+)["']/i)?.[1];
  const candidate = iframeSrc ?? rawValue;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.replace(/^www\./, '');
    const isGoogleMapsHost =
      hostname === 'google.com' || hostname.endsWith('.google.com');
    const isEmbedPath = url.pathname.includes('/maps/embed');

    if (!isGoogleMapsHost || !isEmbedPath) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div>
      <p className="text-[11px] font-medium text-[#94a3b8]">{label}</p>
      <p className="mt-0.5 min-w-0 break-words text-sm font-medium text-[#202124] [overflow-wrap:anywhere]">
        {value}
      </p>
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
