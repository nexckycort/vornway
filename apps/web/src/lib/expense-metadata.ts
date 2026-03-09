export interface CompositeExpenseItem {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface CompositeExpenseMetadata {
  type: 'composite';
  items: CompositeExpenseItem[];
}

export interface ParsedExpenseMetadata {
  expenseType: 'standard' | 'composite';
  items: CompositeExpenseItem[];
  pinnedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseExpenseMetadata(value: unknown): ParsedExpenseMetadata {
  if (!isRecord(value)) {
    return {
      expenseType: 'standard',
      items: [],
      pinnedAt: null,
    };
  }

  const items =
    value.type === 'composite' && Array.isArray(value.items) ? value.items : [];
  const normalizedItems = items
    .filter(isRecord)
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      description:
        typeof item.description === 'string' ? item.description.trim() : '',
      amount:
        typeof item.amount === 'number' && Number.isFinite(item.amount)
          ? item.amount
          : Number.NaN,
      createdAt:
        typeof item.createdAt === 'string'
          ? item.createdAt
          : new Date().toISOString(),
    }))
    .filter(
      (item) =>
        item.id &&
        item.description &&
        Number.isFinite(item.amount) &&
        item.amount >= 0,
    );

  return {
    expenseType: value.type === 'composite' ? 'composite' : 'standard',
    items: normalizedItems,
    pinnedAt: typeof value.pinnedAt === 'string' ? value.pinnedAt : null,
  };
}

export function sumCompositeExpenseItems(
  items: CompositeExpenseItem[],
): number {
  return Number(
    items.reduce((total, item) => total + item.amount, 0).toFixed(2),
  );
}

export function buildExpenseMetadata({
  items,
  pinnedAt,
}: {
  items?: CompositeExpenseItem[];
  pinnedAt?: string | null;
}): Record<string, unknown> | null {
  const hasItems = Boolean(items && items.length > 0);
  const hasPinnedAt = Boolean(pinnedAt);

  if (!hasItems && !hasPinnedAt) {
    return null;
  }

  return {
    ...(hasItems
      ? {
          type: 'composite',
          items,
        }
      : {}),
    ...(hasPinnedAt ? { pinnedAt } : {}),
  };
}
