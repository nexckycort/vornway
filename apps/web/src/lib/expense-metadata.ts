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

export type ExpenseMetadata = CompositeExpenseMetadata | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseExpenseMetadata(value: unknown): ExpenseMetadata {
  if (!isRecord(value) || value.type !== 'composite') {
    return null;
  }

  const items = Array.isArray(value.items) ? value.items : [];
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
    type: 'composite',
    items: normalizedItems,
  };
}

export function sumCompositeExpenseItems(
  items: CompositeExpenseItem[],
): number {
  return Number(
    items.reduce((total, item) => total + item.amount, 0).toFixed(2),
  );
}

export function buildCompositeExpenseMetadata(
  items: CompositeExpenseItem[],
): CompositeExpenseMetadata {
  return {
    type: 'composite',
    items,
  };
}
