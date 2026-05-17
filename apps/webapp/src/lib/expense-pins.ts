import { useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'vornway:expense-pins:v1';
const CHANGED_EVENT = 'vornway:expense-pins-changed';

type PinStore = Record<string, string[]>;

function readStore(): PinStore {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.entries(parsed as Record<string, unknown>).reduce<PinStore>(
      (acc, [groupId, value]) => {
        if (!Array.isArray(value)) return acc;
        acc[groupId] = value.filter(
          (expenseId): expenseId is string => typeof expenseId === 'string',
        );
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeStore(store: PinStore) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

function getPinnedIds(groupId: string): string[] {
  return readStore()[groupId] ?? [];
}

function getSnapshot(groupId: string): string {
  return JSON.stringify(getPinnedIds(groupId));
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(CHANGED_EVENT, callback);
  };
}

export function toggleLocalExpensePin(
  groupId: string,
  expenseId: string,
): boolean {
  const store = readStore();
  const current = new Set(store[groupId] ?? []);

  if (current.has(expenseId)) {
    current.delete(expenseId);
  } else {
    current.add(expenseId);
  }

  store[groupId] = Array.from(current);
  writeStore(store);

  return current.has(expenseId);
}

export function usePinnedExpenseIds(groupId: string): string[] {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => getSnapshot(groupId),
    () => '[]',
  );

  return useMemo(() => {
    try {
      const parsed = JSON.parse(snapshot) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }, [snapshot]);
}

export function isExpensePinnedLocally(
  groupId: string,
  expenseId: string,
): boolean {
  return getPinnedIds(groupId).includes(expenseId);
}
