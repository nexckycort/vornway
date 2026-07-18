import { createCollection } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { groupsClient } from '#/api/groups';
import type { InferRequestType } from '#/api/types';
import { m } from '#/paraglide/messages.js';

const createExpenseEndpoint = groupsClient[':id'].expenses.$post;

type CreateExpensePayload = InferRequestType<
  typeof createExpenseEndpoint
>['json'];

type PendingExpense = {
  id: string;
  groupId: string;
  payload: CreateExpensePayload;
  createdAt: string;
};

const OFFLINE_EXPENSES_STORAGE_KEY = 'vornway.offline.pending-expenses';
const OFFLINE_EXPENSES_EVENT = 'vornway:offline-expenses:changed';
const EXPENSE_REQUEST_TIMEOUT_MS = 3000;
const offlineQueueQueryClient = new QueryClient();
const EMPTY_PENDING_EXPENSES: PendingExpense[] = [];

let cachedRawPendingExpenses: string | null = null;
let cachedPendingExpenses: PendingExpense[] = EMPTY_PENDING_EXPENSES;
const cachedPendingExpensesByGroup = new Map<string, PendingExpense[]>();

function readPendingExpenses(): PendingExpense[] {
  if (typeof window === 'undefined') return EMPTY_PENDING_EXPENSES;

  try {
    const raw = window.localStorage.getItem(OFFLINE_EXPENSES_STORAGE_KEY);

    if (raw === cachedRawPendingExpenses) {
      return cachedPendingExpenses;
    }

    if (!raw) {
      cachedRawPendingExpenses = null;
      cachedPendingExpenses = EMPTY_PENDING_EXPENSES;
      cachedPendingExpensesByGroup.clear();
      return EMPTY_PENDING_EXPENSES;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedRawPendingExpenses = raw;
      cachedPendingExpenses = EMPTY_PENDING_EXPENSES;
      cachedPendingExpensesByGroup.clear();
      return EMPTY_PENDING_EXPENSES;
    }

    cachedRawPendingExpenses = raw;
    cachedPendingExpenses = parsed as PendingExpense[];
    cachedPendingExpensesByGroup.clear();
    return cachedPendingExpenses;
  } catch {
    return EMPTY_PENDING_EXPENSES;
  }
}

function writePendingExpenses(next: PendingExpense[]) {
  if (typeof window === 'undefined') return;

  const raw = JSON.stringify(next);
  window.localStorage.setItem(OFFLINE_EXPENSES_STORAGE_KEY, raw);
  cachedRawPendingExpenses = raw;
  cachedPendingExpenses = next.length > 0 ? next : EMPTY_PENDING_EXPENSES;
  cachedPendingExpensesByGroup.clear();
  window.dispatchEvent(new CustomEvent(OFFLINE_EXPENSES_EVENT));
}

export function getPendingExpensesCount(): number {
  return readPendingExpenses().length;
}

export function getPendingExpensesForGroup(groupId: string): PendingExpense[] {
  readPendingExpenses();

  const cached = cachedPendingExpensesByGroup.get(groupId);
  if (cached) return cached;

  const next = cachedPendingExpenses.filter(
    (expense) => expense.groupId === groupId,
  );
  cachedPendingExpensesByGroup.set(groupId, next);
  return next;
}

export function getEmptyPendingExpenses(): PendingExpense[] {
  return EMPTY_PENDING_EXPENSES;
}

function buildLocalExpenseId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildExpenseId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `expense-${crypto.randomUUID()}`;
  }

  return `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function withExpenseId(payload: CreateExpensePayload): CreateExpensePayload {
  const existingId = (payload as CreateExpensePayload & { id?: unknown }).id;

  return {
    ...payload,
    id:
      typeof existingId === 'string' && existingId.trim()
        ? existingId
        : buildExpenseId(),
  };
}

function enqueuePendingExpense(groupId: string, payload: CreateExpensePayload) {
  const normalizedPayload = withExpenseId(payload);
  const existingPendingExpense = readPendingExpenses().find(
    (expense) =>
      expense.groupId === groupId &&
      expense.payload.id === normalizedPayload.id,
  );

  if (existingPendingExpense) {
    return existingPendingExpense.id;
  }

  const localId = buildLocalExpenseId();
  writePendingExpenses([
    ...readPendingExpenses(),
    {
      id: localId,
      groupId,
      payload: normalizedPayload,
      createdAt: new Date().toISOString(),
    },
  ]);
  return localId;
}

function removePendingExpense(id: string) {
  writePendingExpenses(readPendingExpenses().filter((item) => item.id !== id));
}

export const pendingExpensesCollection = createCollection(
  queryCollectionOptions<PendingExpense>({
    queryKey: ['offline-pending-expenses'],
    queryClient: offlineQueueQueryClient,
    queryFn: async () => readPendingExpenses(),
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const current = readPendingExpenses();
      const additions = (
        transaction.mutations as Array<{ modified: PendingExpense }>
      ).map((mutation) => mutation.modified);
      writePendingExpenses([...current, ...additions]);
      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      const deletions = new Set(
        (transaction.mutations as Array<{ key: string }>).map((mutation) =>
          String(mutation.key),
        ),
      );
      writePendingExpenses(
        readPendingExpenses().filter((item) => !deletions.has(item.id)),
      );
      return { refetch: false };
    },
  }),
);

let isSyncingQueue = false;
let isSyncListenerRegistered = false;

async function postExpenseToApi(
  groupId: string,
  payload: CreateExpensePayload,
) {
  const request = createExpenseEndpoint({
    param: { id: groupId },
    json: withExpenseId(payload),
  });

  const timeout = new Promise<never>((_, reject) => {
    const timer = globalThis.setTimeout(() => {
      clearTimeout(timer);
      reject(new Error('REQUEST_TIMEOUT'));
    }, EXPENSE_REQUEST_TIMEOUT_MS);
  });

  return Promise.race([request, timeout]);
}

export async function syncPendingExpensesQueue() {
  if (typeof window === 'undefined') return;
  if (!navigator.onLine) return;
  if (isSyncingQueue) return;

  const pending = readPendingExpenses();
  if (pending.length === 0) return;

  isSyncingQueue = true;

  try {
    for (const item of pending) {
      try {
        const response = await postExpenseToApi(item.groupId, item.payload);

        if (response.ok) {
          removePendingExpense(item.id);
          continue;
        }

        // 4xx tends to be non-retriable for queued payloads
        if (response.status >= 400 && response.status < 500) {
          removePendingExpense(item.id);
        }
      } catch {
        break;
      }
    }
  } finally {
    isSyncingQueue = false;
  }
}

export function initOfflineExpenseQueueSync() {
  if (typeof window === 'undefined') return;
  if (isSyncListenerRegistered) return;

  isSyncListenerRegistered = true;

  window.addEventListener('online', () => {
    void syncPendingExpensesQueue();
  });

  void syncPendingExpensesQueue();
}

export function subscribePendingExpenses(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === OFFLINE_EXPENSES_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(OFFLINE_EXPENSES_EVENT, callback as EventListener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(
      OFFLINE_EXPENSES_EVENT,
      callback as EventListener,
    );
  };
}

export async function createExpenseOfflineFirst(
  groupId: string,
  payload: CreateExpensePayload,
): Promise<{ id: string; queued: boolean }> {
  const payloadWithId = withExpenseId(payload);

  if (typeof window === 'undefined') {
    const response = await postExpenseToApi(groupId, payloadWithId);
    if (!response.ok) {
      throw new Error(m['system.createExpenseFailed']());
    }

    const data = (await response.json()) as { id: string };
    return { id: data.id, queued: false };
  }

  if (!navigator.onLine) {
    const localId = enqueuePendingExpense(groupId, payloadWithId);
    return { id: localId, queued: true };
  }

  try {
    const response = await postExpenseToApi(groupId, payloadWithId);

    if (response.ok) {
      const data = (await response.json()) as { id: string };
      return { id: data.id, queued: false };
    }

    if (response.status >= 500) {
      const localId = enqueuePendingExpense(groupId, payloadWithId);
      return { id: localId, queued: true };
    }

    const payloadError = (await response.json()) as { error?: string };
    throw new Error(payloadError.error ?? m['system.createExpenseFailed']());
  } catch {
    const localId = enqueuePendingExpense(groupId, payloadWithId);
    return { id: localId, queued: true };
  }
}

export function enqueueExpenseOffline(
  groupId: string,
  payload: CreateExpensePayload,
): { id: string; queued: true } {
  return {
    id: enqueuePendingExpense(groupId, payload),
    queued: true,
  };
}
