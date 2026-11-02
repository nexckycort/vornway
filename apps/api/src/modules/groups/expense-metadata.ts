import type {
  ExpenseDetail,
  ExpensePayload,
} from '@vornway/contracts/modules/groups/expense-schemas';
import { Option, Schema } from 'effect';
import { normalizeAmount } from './helpers';

type AdvancedDetails = NonNullable<
  (typeof ExpenseDetail.Type)['advancedDetails']
>;
type SharedSplit = NonNullable<(typeof ExpenseDetail.Type)['sharedSplit']>;

const EXPENSE_TYPES = [
  'stay',
  'food',
  'transport',
  'activity',
  'purchase',
  'other',
] as const;
const TEXT_FIELDS = [
  'placeName',
  'address',
  'mapUrl',
  'mapEmbedUrl',
  'contactName',
  'phone',
  'email',
  'bookingCode',
  'reservationTime',
  'websiteUrl',
  'notes',
] as const;
const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

const StoredAdvancedDetails = Schema.Struct({
  type: Schema.optional(Schema.String),
  placeName: Schema.optional(Schema.String),
  address: Schema.optional(Schema.String),
  mapUrl: Schema.optional(Schema.String),
  mapEmbedUrl: Schema.optional(Schema.String),
  contactName: Schema.optional(Schema.String),
  phone: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  bookingCode: Schema.optional(Schema.String),
  reservationTime: Schema.optional(Schema.String),
  websiteUrl: Schema.optional(Schema.String),
  notes: Schema.optional(Schema.String),
});
const StoredSharedSplit = Schema.Struct({
  amount: Schema.Number,
  splitMethod: Schema.Literals(['percentage', 'exact']),
  splitValues: Schema.optional(Schema.Record(Schema.String, Schema.Number)),
  items: Schema.optional(
    Schema.Array(Schema.Struct({ name: Schema.String, amount: Schema.Number })),
  ),
});

const field = (metadata: unknown, key: string): unknown =>
  typeof metadata === 'object' && metadata !== null
    ? Reflect.get(metadata, key)
    : undefined;

export const sanitizeAdvancedDetails = (
  details: typeof StoredAdvancedDetails.Type | null | undefined,
): AdvancedDetails | null => {
  if (!details) return null;
  const fields = Object.fromEntries(
    TEXT_FIELDS.flatMap((key) => {
      const value = details[key]?.trim();
      return value ? [[key, value]] : [];
    }),
  );
  if (Object.keys(fields).length === 0) return null;
  const type = EXPENSE_TYPES.find((candidate) => candidate === details.type);
  return { type: type ?? 'other', ...fields };
};

export const sanitizeSharedSplit = (
  sharedSplit: (typeof ExpensePayload.Type)['sharedSplit'] | null,
): SharedSplit | null => {
  if (!sharedSplit) return null;
  const items = sharedSplit.items
    ?.map((item) => ({
      name: item.name.trim(),
      amount: normalizeAmount(item.amount),
    }))
    .filter(
      (item) =>
        item.name.length > 0 && Number.isFinite(item.amount) && item.amount > 0,
    );
  const normalizedItems = items && items.length > 0 ? items : undefined;
  const amount = normalizedItems
    ? normalizedItems.reduce((sum, item) => sum + item.amount, 0)
    : sharedSplit.amount;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const splitValues = Object.fromEntries(
    Object.entries(sharedSplit.splitValues ?? {}).filter(
      ([memberId, value]) =>
        memberId.length > 0 && Number.isFinite(value) && value >= 0,
    ),
  );
  return {
    amount: normalizeAmount(amount),
    splitMethod: sharedSplit.splitMethod,
    ...(Object.keys(splitValues).length > 0 ? { splitValues } : {}),
    ...(normalizedItems ? { items: normalizedItems } : {}),
  };
};

export const normalizeExpenseTags = (tags: readonly string[] | undefined) =>
  Array.from(
    new Set(
      (tags ?? [])
        .map((tag) =>
          tag
            .trim()
            .toLowerCase()
            .replace(/^#+/, '')
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
        )
        .filter((tag) => TAG_PATTERN.test(tag)),
    ),
  ).slice(0, 10);

export const readAdvancedDetails = (metadata: unknown) =>
  Schema.decodeUnknownOption(StoredAdvancedDetails)(
    field(metadata, 'advancedDetails'),
  ).pipe(Option.map(sanitizeAdvancedDetails), Option.getOrNull);

export const readSharedSplit = (metadata: unknown) =>
  Schema.decodeUnknownOption(StoredSharedSplit)(
    field(metadata, 'sharedSplit'),
  ).pipe(Option.map(sanitizeSharedSplit), Option.getOrNull);

export const readExpenseTags = (metadata: unknown) => {
  const tags = field(metadata, 'tags');
  return normalizeExpenseTags(
    Array.isArray(tags)
      ? tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
  );
};
