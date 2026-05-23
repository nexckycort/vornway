import { createCollection } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { client, type InferRequestType } from '#/lib/hc';

const createExpenseEndpoint = client.api.groups[':id'].expenses.$post;

type CreateExpensePayload = InferRequestType<typeof createExpenseEndpoint>['json'];

type PendingExpense = {
  id: string;
  groupId: string;
  payload: CreateExpensePayload;
  createdAt: string;
};

const OFFLINE_EXPENSES_STORAGE_KEY = 'vornway.offline.pending-expenses';
const OFFLINE_EXPENSES_EVENT = 'vornway:offline-expenses:changed';
const offlineQueueQueryClient = new QueryClient();

function readPendingExpenses(): PendingExpense[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(OFFLINE_EXPENSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingExpense[];
  } catch {
    return [];
  }
}

function writePendingExpenses(next: PendingExpense[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    OFFLINE_EXPENSES_STORAGE_KEY,
    JSON.stringify(next),
  );
  window.dispatchEvent(new CustomEvent(OFFLINE_EXPENSES_EVENT));
}

export function getPendingExpensesCount(): number {
  return readPendingExpenses().length;
}

function buildLocalExpenseId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const pendingExpensesCollection = createCollection(
  queryCollectionOptions<PendingExpense>({
    queryKey: ['offline-pending-expenses'],
    queryClient: offlineQueueQueryClient,
    queryFn: async () => readPendingExpenses(),
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const current = readPendingExpenses();
      const additions = (transaction.mutations as Array<{ modified: PendingExpense }>).map(
        (mutation) => mutation.modified,
      );
      writePendingExpenses([...current, ...additions]);
      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      const deletions = new Set(
        (transaction.mutations as Array<{ key: string }>).map(
          (mutation) => String(mutation.key),
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

async function postExpenseToApi(groupId: string, payload: CreateExpensePayload) {
  const response = await createExpenseEndpoint({
    param: { id: groupId },
    json: payload,
  });

  return response;
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
          pendingExpensesCollection.delete(item.id);
          continue;
        }

        // 4xx tends to be non-retriable for queued payloads
        if (response.status >= 400 && response.status < 500) {
          pendingExpensesCollection.delete(item.id);
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

export function subscribePendingExpenses(
  callback: () => void,
): () => void {
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
  if (typeof window === 'undefined') {
    const response = await postExpenseToApi(groupId, payload);
    if (!response.ok) {
      throw new Error('No se pudo crear el gasto');
    }

    const data = (await response.json()) as { id: string };
    return { id: data.id, queued: false };
  }

  if (!navigator.onLine) {
    const localId = buildLocalExpenseId();
    pendingExpensesCollection.insert({
      id: localId,
      groupId,
      payload,
      createdAt: new Date().toISOString(),
    });
    return { id: localId, queued: true };
  }

  try {
    const response = await postExpenseToApi(groupId, payload);

    if (response.ok) {
      const data = (await response.json()) as { id: string };
      return { id: data.id, queued: false };
    }

    if (response.status >= 500) {
      const localId = buildLocalExpenseId();
      pendingExpensesCollection.insert({
        id: localId,
        groupId,
        payload,
        createdAt: new Date().toISOString(),
      });
      return { id: localId, queued: true };
    }

    const payloadError = (await response.json()) as { error?: string };
    throw new Error(payloadError.error ?? 'No se pudo crear el gasto');
  } catch {
    const localId = buildLocalExpenseId();
    pendingExpensesCollection.insert({
      id: localId,
      groupId,
      payload,
      createdAt: new Date().toISOString(),
    });
    return { id: localId, queued: true };
  }
}
