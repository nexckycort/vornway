type DbExpenseType = 'STANDARD' | 'COMPOSITE' | 'SETTLEMENT';
type DbExpenseStatus = 'ACTIVE' | 'DELETED';

export function isExpenseDeleted(status: DbExpenseStatus): boolean {
  return status === 'DELETED';
}

export function isExpenseSettlement(expenseType: DbExpenseType): boolean {
  return expenseType === 'SETTLEMENT';
}

export function toClientExpenseType(
  expenseType: DbExpenseType,
): 'standard' | 'composite' {
  return expenseType === 'COMPOSITE' ? 'composite' : 'standard';
}

export function readPinnedAt(pinnedAt: Date | null): string | null {
  return pinnedAt ? pinnedAt.toISOString() : null;
}
