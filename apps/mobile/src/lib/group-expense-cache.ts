import * as SecureStore from 'expo-secure-store';

export type CachedGroupExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date?: string;
  isSettlement?: boolean;
  isDeleted?: boolean;
};

const storageKey = (groupId: string) =>
  `vornway:cache:group-expenses:${groupId}`;

export async function readCachedGroupExpenses(
  groupId: string,
): Promise<CachedGroupExpense[]> {
  try {
    const value = await SecureStore.getItemAsync(storageKey(groupId));
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as CachedGroupExpense[]) : [];
  } catch {
    return [];
  }
}

export async function cacheGroupExpenses(
  groupId: string,
  expenses: CachedGroupExpense[],
) {
  if (!groupId || expenses.length === 0) return;
  const current = await readCachedGroupExpenses(groupId);
  const merged = new Map(current.map((expense) => [expense.id, expense]));
  for (const expense of expenses) merged.set(expense.id, expense);
  await SecureStore.setItemAsync(
    storageKey(groupId),
    JSON.stringify([...merged.values()]),
  );
}
