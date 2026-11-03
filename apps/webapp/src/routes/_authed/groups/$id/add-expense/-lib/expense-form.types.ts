import { m } from '#/paraglide/messages.js';
import type { ExpenseAdvancedDetails } from '#/routes/_authed/groups/$id/-types/group-detail.types';

export type SplitMethod = 'equal' | 'percentage' | 'exact';
export type AdvancedDetailsType = ExpenseAdvancedDetails['type'];
export type ExpenseSharedSplit = {
  amount: number;
  splitMethod: Exclude<SplitMethod, 'equal'>;
  splitValues?: Record<string, number>;
  items?: {
    name: string;
    amount: number;
  }[];
};

export type SharedExpenseItem = {
  id: string;
  name: string;
  amount: string;
};

export type ExpenseLineItem = {
  id: string;
  memberId: string;
  description: string;
  amount: string;
};

export const splitMethods: { value: SplitMethod; label: string }[] = [
  { value: 'equal', label: m['groups.expense.splitEqual']() },
  { value: 'percentage', label: m['groups.expense.splitPercentage']() },
  { value: 'exact', label: m['groups.expense.splitExact']() },
];

export const currencyMeta: Record<
  string,
  { label: string; flag: string; name: string }
> = {
  COP: { label: 'COP', flag: '🇨🇴', name: m['common.currency.copFull']() },
  USD: { label: 'USD', flag: '🇺🇸', name: m['common.currency.usdFull']() },
  EUR: { label: 'EUR', flag: '🇪🇺', name: m['common.currency.eurFull']() },
  GBP: { label: 'GBP', flag: '🇬🇧', name: m['common.currency.gbpFull']() },
  MXN: { label: 'MXN', flag: '🇲🇽', name: m['common.currency.mxnFull']() },
  BRL: { label: 'BRL', flag: '🇧🇷', name: m['common.currency.brlFull']() },
};

export const currencyOptions = [
  'COP',
  'EUR',
  'USD',
  'GBP',
  'MXN',
  'BRL',
] as const;
export const advancedDetailsTypeOptions: {
  value: AdvancedDetailsType;
  label: string;
  description: string;
}[] = [
  {
    value: 'stay',
    label: m['groups.expense.advancedTypeStay'](),
    description: m['groups.expense.advancedTypeStayDescription'](),
  },
  {
    value: 'food',
    label: m['groups.expense.advancedTypeFood'](),
    description: m['groups.expense.advancedTypeFoodDescription'](),
  },
  {
    value: 'transport',
    label: m['groups.expense.advancedTypeTransport'](),
    description: m['groups.expense.advancedTypeTransportDescription'](),
  },
  {
    value: 'activity',
    label: m['groups.expense.advancedTypeActivity'](),
    description: m['groups.expense.advancedTypeActivityDescription'](),
  },
  {
    value: 'purchase',
    label: m['groups.expense.advancedTypePurchase'](),
    description: m['groups.expense.advancedTypePurchaseDescription'](),
  },
  {
    value: 'other',
    label: m['groups.expense.advancedTypeOther'](),
    description: m['groups.expense.advancedTypeOtherDescription'](),
  },
];

export const emptyAdvancedDetails: ExpenseAdvancedDetails = {
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

export const customCategoryIconId = 'custom';

export const categoryColorOptions = [
  '#ff7fa3',
  '#5bd9cc',
  '#d978f4',
  '#ffa0a0',
  '#ffd741',
  '#62d9aa',
  '#9daef9',
  '#ffc06d',
] as const;
