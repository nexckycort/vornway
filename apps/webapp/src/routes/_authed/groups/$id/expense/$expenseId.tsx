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
import { useDeleteExpenseMutation } from '#/routes/_authed/groups/-hooks/use-delete-expense';
import {
  useGroupExpenseQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { CategoryIcon } from '../-components/category-icon';
import { getExpenseEmoji } from '../-components/group-detail.utils';
import type { ExpenseItem, GroupSummary } from '../-types/group-detail.types';

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

function RouteComponent() {
  const { id, expenseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { flowState, navigateToGroupRoot } = useGroupFlowNavigation(id);
  const groupSummaryQuery = useGroupSummaryQuery(id);
  const expenseQuery = useGroupExpenseQuery(id, expenseId);
  const deleteExpenseMutation = useDeleteExpenseMutation(id);
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);

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
            aria-label="Atrás"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-semibold text-[#0f172a]">
              Detalle
            </h1>
          </div>
          <span className="size-9" />
        </header>

        {expenseQuery.isLoading && !fallbackExpense ? (
          <ExpenseDetailSkeleton />
        ) : null}

        {!expenseQuery.isLoading && !fallbackExpense && !expense ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No encontramos este gasto en la página cargada. Vuelve al listado y
            ábrelo desde allí.
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
                      ? `${paidByMembers.length} personas pagaron`
                      : expense.paidBy.name}
                  </span>
                </p>
              </div>

              <div className="relative border-t border-dashed border-[#e2e8f0] px-5 pb-6 pt-5 before:absolute before:-left-3 before:-top-3 before:size-6 before:rounded-full before:bg-[#ececec] after:absolute after:-right-3 after:-top-3 after:size-6 after:rounded-full after:bg-[#ececec]">
                <p className="mb-4 text-xs font-medium text-[#444444]">
                  Pagado por
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
                        name={`${payer.name}${member?.isCurrentUser ? ' (Tu)' : ''}`}
                        amount={formatAmount(expense.currency, payer.amount)}
                      />
                    );
                  })}
                </div>

                {!isSettlement ? (
                  <>
                    <p className="mb-4 mt-7 text-xs font-medium text-[#444444]">
                      Se divide con
                    </p>
                    <div className="space-y-5">
                      {participants.map((participant) => {
                        const member = getMemberMeta(
                          participant.memberId,
                          groupSummaryQuery.data?.members,
                        );

                        return (
                          <MemberLine
                            key={participant.memberId}
                            image={member?.image ?? null}
                            name={`${participant.name}${member?.isCurrentUser ? ' (Tu)' : ''}`}
                            amount={formatAmount(
                              expense.currency,
                              participant.share,
                            )}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {advancedDetails ? (
                  <>
                    <p className="mb-4 mt-7 text-xs font-medium text-[#444444]">
                      Detalles del lugar
                    </p>
                    <div className="min-w-0 space-y-3 rounded-3xl bg-[#fafafa] p-4">
                      {mapEmbedUrl ? (
                        <div className="max-w-full overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white">
                          <iframe
                            title={`Mapa de ${advancedDetails.placeName ?? expense.description}`}
                            src={mapEmbedUrl}
                            className="block aspect-[4/3] w-full max-w-full"
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      ) : null}

                      <DetailLine
                        label="Tipo"
                        value={getAdvancedTypeLabel(advancedDetails.type)}
                      />
                      <DetailLine
                        label="Lugar"
                        value={advancedDetails.placeName}
                      />
                      <DetailLine
                        label="Dirección"
                        value={advancedDetails.address}
                      />
                      {!mapEmbedUrl ? (
                        <DetailLine
                          label="Mapa"
                          value={advancedDetails.mapUrl}
                        />
                      ) : null}
                      <DetailLine
                        label="Contacto"
                        value={advancedDetails.contactName}
                      />
                      <DetailLine
                        label="Teléfono"
                        value={advancedDetails.phone}
                      />
                      <DetailLine
                        label="Correo"
                        value={advancedDetails.email}
                      />
                      <DetailLine
                        label="Reserva"
                        value={advancedDetails.bookingCode}
                      />
                      <DetailLine
                        label="Fecha u hora"
                        value={advancedDetails.reservationTime}
                      />
                      <DetailLine
                        label="Link"
                        value={advancedDetails.websiteUrl}
                      />
                      <DetailLine label="Notas" value={advancedDetails.notes} />
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
                    isSettlement ? 'Eliminar liquidación' : 'Eliminar gasto'
                  }
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleEditExpense}
                  className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#080202] text-sm font-semibold text-white"
                >
                  {isSettlement ? 'Editar liquidación' : 'Editar gasto'}
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
              {isSettlement ? 'Eliminar liquidación' : 'Eliminar gasto'}
            </DrawerTitle>
            <DrawerDescription>
              {isSettlement
                ? 'Esta acción eliminará la liquidación y restaurará la deuda pendiente.'
                : 'Esta acción eliminará el gasto del grupo.'}
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
              {deleteExpenseMutation.isPending ? 'Eliminando…' : 'Eliminar'}
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
}: {
  image: string | null;
  name: string;
  amount?: string;
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
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#202124]">
        {name}
      </span>
      {amount ? (
        <span className="shrink-0 text-sm font-semibold text-[#202124]">
          {amount}
        </span>
      ) : null}
    </div>
  );
}

function getAdvancedTypeLabel(type: string) {
  switch (type) {
    case 'stay':
      return 'Estadía';
    case 'food':
      return 'Comida';
    case 'transport':
      return 'Transporte';
    case 'activity':
      return 'Actividad';
    case 'purchase':
      return 'Compra';
    default:
      return 'Otro';
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
