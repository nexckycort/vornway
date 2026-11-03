import type { ApiPayload } from '@vornway/api-client';

export type ExpensePayload = ApiPayload<'groups', 'createExpense'>;
export type SplitMethod = 'equal' | 'percentage' | 'exact';
export type AdvancedExpenseType =
  | 'stay'
  | 'food'
  | 'transport'
  | 'activity'
  | 'purchase'
  | 'other';
export type SharedExpenseItem = { id: string; name: string; amount: string };
export type AdvancedDetailsForm = {
  type: AdvancedExpenseType;
  placeName: string;
  address: string;
  mapUrl: string;
  contactName: string;
  phone: string;
  email: string;
  bookingCode: string;
  reservationTime: string;
  websiteUrl: string;
  notes: string;
};
export type ExpenseAttachment = { dataUrl: string; fileName?: string };

export const emptyAdvancedDetails: AdvancedDetailsForm = {
  type: 'other',
  placeName: '',
  address: '',
  mapUrl: '',
  contactName: '',
  phone: '',
  email: '',
  bookingCode: '',
  reservationTime: '',
  websiteUrl: '',
  notes: '',
};

export type ExpenseFormValues = {
  description: string;
  amount: string;
  currency: string;
  tags: string;
  selectedIds: string[];
  categoryId: string;
  paidByIds: string[];
  payerValues: Record<string, string>;
  splitMethod: SplitMethod;
  shareValues: Record<string, string>;
  sharedExpenseItems: SharedExpenseItem[];
  lineItemDescriptions: Record<string, string>;
  advanced: AdvancedDetailsForm;
  attachment: ExpenseAttachment | null;
  advancedDetailsEnabled: boolean;
  isPersonal: boolean;
};

const toNumber = (value: string) => Number(value.replace(',', '.'));

const optional = (
  entries: readonly (readonly [string, string | undefined])[],
) =>
  Object.fromEntries(
    entries.flatMap(([key, value]) =>
      value?.trim() ? [[key, value.trim()]] : [],
    ),
  );

export const buildExpensePayload = async (
  form: ExpenseFormValues,
  resolveMapEmbedUrl: (url: string) => Promise<string | undefined>,
): Promise<ExpensePayload> => {
  const parsedAmount = toNumber(form.amount);
  const sharedItems = form.sharedExpenseItems
    .map((item) => ({
      name: item.name.trim(),
      amount: toNumber(item.amount) || 0,
    }))
    .filter((item) => item.name && item.amount > 0);
  const hasInvalidSharedItem = form.sharedExpenseItems.some((item) => {
    const itemAmount = toNumber(item.amount);
    return !item.name.trim() || !Number.isFinite(itemAmount) || itemAmount <= 0;
  });
  const sharedAmount = sharedItems.reduce((sum, item) => sum + item.amount, 0);
  const baseAmount = Math.max(parsedAmount - sharedAmount, 0);
  const sharedShare =
    form.selectedIds.length > 0 ? sharedAmount / form.selectedIds.length : 0;
  const rawValues = Object.fromEntries(
    form.selectedIds.map((memberId) => [
      memberId,
      toNumber(form.shareValues[memberId] ?? '') || 0,
    ]),
  );
  const values = Object.fromEntries(
    form.selectedIds.map((memberId) => {
      const entered = rawValues[memberId] ?? 0;
      return [
        memberId,
        form.splitMethod === 'percentage'
          ? baseAmount * (entered / 100) + sharedShare
          : entered + sharedShare,
      ];
    }),
  );
  const expectedTotal = form.splitMethod === 'percentage' ? 100 : parsedAmount;
  const rawTotal = Object.values(rawValues).reduce(
    (sum, value) => sum + value,
    0,
  );
  const payerIds = form.paidByIds;
  const payerAmounts = payerIds.map((memberId) => ({
    memberId,
    amount:
      payerIds.length === 1
        ? parsedAmount
        : toNumber(form.payerValues[memberId] ?? '') || 0,
  }));
  const payerTotal = payerAmounts.reduce((sum, payer) => sum + payer.amount, 0);
  if (
    !form.description.trim() ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    form.selectedIds.length === 0 ||
    payerIds.length === 0 ||
    hasInvalidSharedItem ||
    sharedAmount > parsedAmount ||
    (payerIds.length > 1 && Math.abs(payerTotal - parsedAmount) > 0.01) ||
    (form.splitMethod === 'exact' &&
      Object.values(values).some((value) => value <= 0)) ||
    (form.splitMethod === 'percentage' &&
      (Math.abs(rawTotal - expectedTotal) > 0.01 ||
        Object.values(rawValues).some((value) => value <= 0))) ||
    (form.splitMethod === 'exact' &&
      Math.abs(rawTotal + sharedAmount - parsedAmount) > 0.01)
  )
    throw new Error('invalid');

  const mapEmbedUrl =
    form.advancedDetailsEnabled && form.advanced.mapUrl.trim()
      ? await resolveMapEmbedUrl(form.advanced.mapUrl.trim())
      : undefined;
  const details = form.advanced;
  return {
    description: form.description.trim(),
    amount: parsedAmount,
    currency: form.currency,
    participantIds: form.isPersonal ? [] : form.selectedIds,
    ...(payerIds[0] ? { paidById: payerIds[0] } : {}),
    paidByIds: payerIds,
    ...(payerIds.length > 1 ? { payers: payerAmounts } : {}),
    splitMethod:
      sharedAmount > 0 && form.splitMethod !== 'equal'
        ? 'exact'
        : form.splitMethod,
    ...(form.splitMethod !== 'equal'
      ? {
          exactShares: values,
          ...(sharedAmount > 0
            ? {
                sharedSplit: {
                  amount: sharedAmount,
                  splitMethod: form.splitMethod,
                  splitValues: rawValues,
                  items: sharedItems,
                },
              }
            : {}),
        }
      : {}),
    ...(form.splitMethod === 'exact'
      ? {
          lineItems: form.selectedIds.map((memberId) => ({
            memberId,
            description:
              form.lineItemDescriptions[memberId]?.trim() || 'Gasto compartido',
            amount: values[memberId] ?? 0,
          })),
        }
      : {}),
    ...(form.categoryId ? { categoryId: form.categoryId } : {}),
    ...(form.advancedDetailsEnabled
      ? {
          advancedDetails: {
            type: details.type,
            ...optional([
              ['placeName', details.placeName],
              ['address', details.address],
              ['mapUrl', details.mapUrl],
              ['mapEmbedUrl', mapEmbedUrl],
              ['contactName', details.contactName],
              ['phone', details.phone],
              ['email', details.email],
              ['bookingCode', details.bookingCode],
              ['reservationTime', details.reservationTime],
              ['websiteUrl', details.websiteUrl],
              ['notes', details.notes],
            ]),
          },
        }
      : {}),
    ...(form.advancedDetailsEnabled && form.attachment
      ? { attachmentImage: form.attachment }
      : {}),
    ...(form.isPersonal
      ? {
          tags: form.tags
            .split(/[\s,]+/)
            .map((tag) => tag.replace(/^#/, '').trim())
            .filter(Boolean)
            .slice(0, 10),
        }
      : {}),
  };
};
