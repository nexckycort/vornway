import { Schema } from 'effect';
import { literalsWithFallback, Page, TrimmedString } from '../../schema.ts';
import { Amount, ImageUpload, MoneyByCurrency, NonEmpty } from './schemas.ts';

const NonNegative = Schema.Number.check(Schema.isGreaterThanOrEqualTo(0));
const SharesByMember = Schema.Record(Schema.String, NonNegative);
const EXPENSE_TYPES = [
  'stay',
  'food',
  'transport',
  'activity',
  'purchase',
  'other',
] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (max: number) =>
  Schema.optionalKey(TrimmedString.check(Schema.isMaxLength(max)));

export const ExpenseSharedSplit = Schema.Struct({
  amount: Amount,
  splitMethod: Schema.Literals(['percentage', 'exact']),
  splitValues: Schema.optionalKey(SharesByMember),
  items: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        name: TrimmedString.check(
          Schema.isMinLength(1),
          Schema.isMaxLength(160),
        ),
        amount: Amount,
      }),
    ).check(Schema.isMinLength(1)),
  ),
});
export const ExpenseLineItem = Schema.Struct({
  memberId: NonEmpty,
  description: TrimmedString.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(160),
  ),
  amount: Amount,
});
const ExpenseAdvancedDetails = Schema.Struct({
  type: Schema.optionalKey(Schema.Literals(EXPENSE_TYPES)),
  placeName: text(160),
  address: text(240),
  mapUrl: text(500),
  mapEmbedUrl: text(1000),
  contactName: text(120),
  phone: text(80),
  email: Schema.optionalKey(
    Schema.Union([
      Schema.Literal(''),
      TrimmedString.check(Schema.isMaxLength(160), Schema.isPattern(EMAIL)),
    ]),
  ),
  bookingCode: text(120),
  reservationTime: text(80),
  websiteUrl: text(500),
  notes: text(600),
});

export const ExpensePayload = Schema.Struct({
  id: Schema.optionalKey(
    TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
  ),
  description: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(160),
  ),
  amount: Amount,
  currency: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(8)),
  accountId: Schema.optionalKey(Schema.NullOr(NonEmpty)),
  categoryId: Schema.optionalKey(NonEmpty),
  paidById: Schema.optionalKey(NonEmpty),
  paidByIds: Schema.optionalKey(
    Schema.Array(NonEmpty).check(Schema.isMinLength(1)),
  ),
  payers: Schema.optionalKey(
    Schema.Array(Schema.Struct({ memberId: NonEmpty, amount: Amount })).check(
      Schema.isMinLength(1),
    ),
  ),
  participantIds: Schema.optionalKey(Schema.Array(NonEmpty)),
  splitMethod: Schema.optionalKey(
    Schema.Literals(['equal', 'percentage', 'exact']),
  ),
  exactShares: Schema.optionalKey(SharesByMember),
  lineItems: Schema.optionalKey(
    Schema.Array(ExpenseLineItem).check(Schema.isMaxLength(100)),
  ),
  sharedSplit: Schema.optionalKey(ExpenseSharedSplit),
  tags: Schema.optionalKey(
    Schema.Array(
      TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(40)),
    ).check(Schema.isMaxLength(10)),
  ),
  attachmentImage: Schema.optionalKey(ImageUpload),
  advancedDetails: Schema.optionalKey(ExpenseAdvancedDetails),
}).check(
  Schema.makeFilter((data) => {
    const itemTotals = [
      ...Map.groupBy(data.lineItems ?? [], (item) => item.memberId),
    ].map(
      ([memberId, items]) =>
        [memberId, items.reduce((sum, item) => sum + item.amount, 0)] as const,
    );
    const lineItemsMatch =
      itemTotals.length === 0 ||
      ((data.splitMethod ?? 'equal') === 'exact' &&
        itemTotals.every(([memberId, total]) => {
          const expected =
            data.sharedSplit?.splitValues?.[memberId] ??
            data.exactShares?.[memberId];
          return (
            typeof expected === 'number' && Math.abs(total - expected) < 0.01
          );
        }));
    if (!lineItemsMatch) {
      return {
        path: ['lineItems'],
        issue:
          'El desglose de cada participante debe coincidir con su monto individual',
      };
    }
    if (!data.paidByIds?.length && !data.paidById?.trim()) {
      return {
        path: ['paidByIds'],
        issue: 'Debes seleccionar al menos una persona que pagó',
      };
    }
    const payersTotal = data.payers?.reduce((sum, p) => sum + p.amount, 0);
    if (
      payersTotal !== undefined &&
      Math.abs(payersTotal - data.amount) >= 0.01
    ) {
      return {
        path: ['payers'],
        issue: 'La suma de los pagadores debe ser igual al monto total',
      };
    }
    return undefined;
  }),
);

export const SettlementPayload = Schema.Struct({
  fromMemberId: NonEmpty,
  toMemberId: NonEmpty,
  amount: Amount,
  currency: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(8)),
});

const CategoryRef = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.NullOr(Schema.String),
  color: Schema.NullOr(Schema.String),
});
const MemberRef = Schema.Struct({ id: Schema.String, name: Schema.String });
const PaidByMember = Schema.Struct({
  memberId: Schema.String,
  name: Schema.String,
  amount: Schema.Number,
});
const ExpenseParticipant = Schema.Struct({
  memberId: Schema.String,
  name: Schema.String,
  share: Schema.Number,
});

export const ExpenseListItem = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  amount: Schema.Number,
  attachmentUrl: Schema.NullOr(Schema.String),
  currency: Schema.String,
  date: Schema.String,
  isDeleted: Schema.Boolean,
  isSettlement: Schema.Boolean,
  isPersonal: Schema.Boolean,
  expenseType: literalsWithFallback(['standard', 'composite'], 'unknown'),
  subExpenseCount: Schema.Int,
  settlementToName: Schema.NullOr(Schema.String),
  paidBy: MemberRef,
  paidByMembers: Schema.Array(PaidByMember),
  category: Schema.NullOr(CategoryRef),
  participantCount: Schema.Int,
  currentUserBalance: Schema.NullOr(Schema.Number),
  tags: Schema.Array(Schema.String),
});
export const MemberExpenseListItem = Schema.Struct({
  ...ExpenseListItem.fields,
  participants: Schema.Array(ExpenseParticipant),
});
export const MemberExpensesSummary = Schema.Struct({
  spentByCurrency: MoneyByCurrency,
  grossPaidByCurrency: MoneyByCurrency,
});
export const ExpenseListPage = Page(ExpenseListItem);
export const MemberExpenseListPage = Schema.Struct({
  ...Page(MemberExpenseListItem).fields,
  summary: MemberExpensesSummary,
});

export const ExpenseDetail = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  amount: Schema.Number,
  accountId: Schema.NullOr(Schema.String),
  attachmentUrl: Schema.NullOr(Schema.String),
  currency: Schema.String,
  date: Schema.String,
  isDeleted: Schema.Boolean,
  isSettlement: Schema.Boolean,
  splitMethod: literalsWithFallback(
    ['equal', 'percentage', 'exact'],
    'unknown',
  ),
  category: Schema.NullOr(CategoryRef),
  paidBy: MemberRef,
  paidByMembers: Schema.Array(PaidByMember),
  participants: Schema.Array(ExpenseParticipant),
  lineItems: Schema.Array(
    Schema.Struct({
      memberId: Schema.String,
      description: Schema.String,
      amount: Schema.Number,
    }),
  ),
  sharedSplit: Schema.NullOr(
    Schema.Struct({
      amount: Schema.Number,
      splitMethod: Schema.Literals(['percentage', 'exact']),
      splitValues: Schema.optionalKey(
        Schema.Record(Schema.String, Schema.Number),
      ),
      items: Schema.optionalKey(
        Schema.Array(
          Schema.Struct({ name: Schema.String, amount: Schema.Number }),
        ),
      ),
    }),
  ),
  tags: Schema.Array(Schema.String),
  advancedDetails: Schema.NullOr(
    Schema.Struct({
      type: literalsWithFallback(EXPENSE_TYPES, 'unknown'),
      placeName: Schema.optionalKey(Schema.String),
      address: Schema.optionalKey(Schema.String),
      mapUrl: Schema.optionalKey(Schema.String),
      mapEmbedUrl: Schema.optionalKey(Schema.String),
      contactName: Schema.optionalKey(Schema.String),
      phone: Schema.optionalKey(Schema.String),
      email: Schema.optionalKey(Schema.String),
      bookingCode: Schema.optionalKey(Schema.String),
      reservationTime: Schema.optionalKey(Schema.String),
      websiteUrl: Schema.optionalKey(Schema.String),
      notes: Schema.optionalKey(Schema.String),
    }),
  ),
});
export const ExpenseRef = Schema.Struct({ id: Schema.String });
