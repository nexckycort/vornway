import { Schema } from 'effect';
import { PageQuery } from '../../schema.ts';
import { MoneyByCurrency, NonEmpty } from './schemas.ts';

const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const DateRangeValue = Schema.String.check(Schema.isPattern(ISO_DATETIME));
const ReportRange = Schema.Literals(['all', 'custom']);

type DateRange = {
  readonly range?: 'all' | 'custom';
  readonly startDate?: string;
  readonly endDate?: string;
};

export const endNotBeforeStart = (data: DateRange) =>
  !data.startDate ||
  !data.endDate ||
  new Date(data.endDate) >= new Date(data.startDate)
    ? undefined
    : {
        path: ['endDate'],
        issue: 'La fecha final debe ser mayor o igual a la inicial',
      };

const dateRangeFilter = Schema.makeFilter((data: DateRange) =>
  data.range === 'custom' && !(data.startDate && data.endDate)
    ? { path: ['startDate'], issue: 'Debes enviar fecha inicial y final' }
    : endNotBeforeStart(data),
);

const dateRangeFields = {
  startDate: Schema.optionalKey(DateRangeValue),
  endDate: Schema.optionalKey(DateRangeValue),
};

export const MemberExpensesQuery = Schema.Struct({
  ...PageQuery.fields,
  categoryId: Schema.optionalKey(NonEmpty),
  uncategorized: Schema.optionalKey(Schema.Boolean),
  paidOnly: Schema.optionalKey(Schema.Boolean),
  ...dateRangeFields,
}).check(Schema.makeFilter(endNotBeforeStart));

export const ReportsQuery = Schema.Struct({
  range: Schema.optionalKey(ReportRange),
  ...dateRangeFields,
}).check(dateRangeFilter);
export const CategoryCountQuery = Schema.Struct({
  range: Schema.optionalKey(ReportRange),
  ...dateRangeFields,
  categoryId: Schema.optionalKey(NonEmpty),
  uncategorized: Schema.optionalKey(Schema.Boolean),
  currency: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(8)),
  participantIds: Schema.optionalKey(NonEmpty),
}).check(dateRangeFilter);

const reportFields = {
  range: ReportRange,
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
};
const CountByCurrency = Schema.Record(Schema.String, Schema.Int);
const ReportCategory = Schema.Struct({
  key: Schema.String,
  id: Schema.NullOr(Schema.String),
  name: Schema.String,
  icon: Schema.NullOr(Schema.String),
  amount: Schema.Number,
  fill: Schema.String,
});
const ReportTag = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  amount: Schema.Number,
  fill: Schema.String,
});

export const ReportsTotals = Schema.Struct({
  ...reportFields,
  totalsByCurrency: MoneyByCurrency,
  expenseCountByCurrency: CountByCurrency,
  currentUserSpentByCurrency: MoneyByCurrency,
  categoriesByCurrency: Schema.Record(
    Schema.String,
    Schema.Array(ReportCategory),
  ),
  tagsByCurrency: Schema.Record(Schema.String, Schema.Array(ReportTag)),
});
export const ReportsCategoryCount = Schema.Struct({
  ...reportFields,
  expenseCount: Schema.Int,
});
export const ReportsBalances = Schema.Struct({
  ...reportFields,
  memberBalances: Schema.Array(
    Schema.Struct({
      memberId: Schema.String,
      name: Schema.String,
      isCurrentUser: Schema.Boolean,
      balances: MoneyByCurrency,
    }),
  ),
});
export const ReportsShares = Schema.Struct({
  ...reportFields,
  memberShares: Schema.Array(
    Schema.Struct({
      memberId: Schema.String,
      name: Schema.String,
      isCurrentUser: Schema.Boolean,
      shares: MoneyByCurrency,
      categorySharesByCurrency: Schema.Record(Schema.String, MoneyByCurrency),
    }),
  ),
});
