import type { InferRequestType } from '#/lib/hc';
import { client } from '#/lib/hc';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

const createExpenseEndpoint = client.api.groups[':id'].expenses.$post;

type CreateExpenseRequest = InferRequestType<typeof createExpenseEndpoint>;
type CreateExpensePayload = CreateExpenseRequest['json'] & {
  clientMutationId?: string;
};

type OfflineExpenseRequest = CreateExpensePayload & {
  clientMutationId: string;
};

type OfflineExpenseQueueItem = {
  id: string;
  groupId: string;
  request: OfflineExpenseRequest;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
};

const STORAGE_KEY = 'vornway:offline-expense-queue:v1';
const STORAGE_EVENT = 'vornway:offline-expense-queue-changed';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readQueue(): OfflineExpenseQueueItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isOfflineExpenseQueueItem);
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineExpenseQueueItem[]) {
  if (!isBrowser()) return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function emitQueueChange() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function isOfflineExpenseQueueItem(
  value: unknown,
): value is OfflineExpenseQueueItem {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as OfflineExpenseQueueItem).id === 'string' &&
    typeof (value as OfflineExpenseQueueItem).groupId === 'string' &&
    typeof (value as OfflineExpenseQueueItem).createdAt === 'string' &&
    typeof (value as OfflineExpenseQueueItem).attempts === 'number' &&
    typeof (value as OfflineExpenseQueueItem).request === 'object' &&
    (value as OfflineExpenseQueueItem).request !== null &&
    typeof (value as OfflineExpenseQueueItem).request.clientMutationId ===
      'string'
  );
}

export function createOfflineExpenseQueueItem(
  groupId: string,
  request: CreateExpensePayload,
): OfflineExpenseQueueItem {
  const item: OfflineExpenseQueueItem = {
    id: crypto.randomUUID(),
    groupId,
    request: {
      ...request,
      clientMutationId:
        'clientMutationId' in request &&
        typeof request.clientMutationId === 'string' &&
        request.clientMutationId.length > 0
          ? request.clientMutationId
          : crypto.randomUUID(),
    },
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);

  return item;
}

export function getOfflineExpenseQueueCount(): number {
  return readQueue().length;
}

function removeOfflineExpenseQueueItem(id: string) {
  const queue = readQueue().filter((item) => item.id !== id);
  writeQueue(queue);
}

function updateOfflineExpenseQueueItem(
  id: string,
  updater: (item: OfflineExpenseQueueItem) => OfflineExpenseQueueItem | null,
) {
  const next = readQueue().flatMap((item) => {
    if (item.id !== id) {
      return [item];
    }

    const updated = updater(item);
    return updated ? [updated] : [];
  });

  writeQueue(next);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'No se pudo sincronizar el gasto';
}

async function createExpenseOnServer(
  groupId: string,
  request: OfflineExpenseRequest,
) {
  const response = await createExpenseEndpoint({
    param: { id: groupId },
    json: request,
  });

  if (response.ok) {
    return (await response.json()) as { id: string };
  }

  const payload = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  const message = getErrorMessage(payload?.error);

  if (response.status >= 500) {
    throw new Error(message);
  }

  throw new Error(message);
}

async function syncOfflineExpenseQueueItem(
  item: OfflineExpenseQueueItem,
  queryClient?: QueryClient,
) {
  const result = await createExpenseOnServer(item.groupId, item.request);

  if (result?.id) {
    await Promise.all([
      queryClient?.invalidateQueries({
        queryKey: ['group-summary', item.groupId],
      }),
      queryClient?.invalidateQueries({
        queryKey: ['group-expenses', item.groupId],
      }),
      queryClient?.invalidateQueries({ queryKey: ['groups-list'] }),
      queryClient?.invalidateQueries({ queryKey: ['home-summary'] }),
    ]);
  }
}

export async function syncQueuedOfflineExpenses(
  queryClient?: QueryClient,
): Promise<number> {
  if (!isBrowser() || !navigator.onLine) {
    return 0;
  }

  const queue = readQueue();
  if (queue.length === 0) {
    return 0;
  }

  let synced = 0;

  for (const item of queue) {
    try {
      await syncOfflineExpenseQueueItem(item, queryClient);
      removeOfflineExpenseQueueItem(item.id);
      emitQueueChange();
      synced += 1;
    } catch (error) {
      updateOfflineExpenseQueueItem(item.id, (current) => ({
        ...current,
        attempts: current.attempts + 1,
        lastError: getErrorMessage(error),
      }));
      break;
    }
  }

  if (synced > 0) {
    toast.success(
      synced === 1
        ? '1 gasto sin conexión sincronizado'
        : `${synced} gastos sin conexión sincronizados`,
    );
  }

  return synced;
}

export async function createExpenseWithOfflineSupport(
  groupId: string,
  request: CreateExpensePayload,
  queryClient?: QueryClient,
): Promise<{ id: string; queued?: boolean }> {
  const clientMutationId =
    'clientMutationId' in request &&
    typeof request.clientMutationId === 'string' &&
    request.clientMutationId.length > 0
      ? request.clientMutationId
      : crypto.randomUUID();

  const payload: OfflineExpenseRequest = {
    ...request,
    clientMutationId,
  };

  const offline =
    typeof navigator !== 'undefined' && navigator.onLine === false;

  if (offline) {
    createOfflineExpenseQueueItem(groupId, payload);
    emitQueueChange();
    toast.success('Se guardó sin conexión y se sincronizará luego');
    return { id: clientMutationId, queued: true };
  }

  try {
    const result = await createExpenseOnServer(groupId, payload);
    await Promise.all([
      queryClient?.invalidateQueries({ queryKey: ['group-summary', groupId] }),
      queryClient?.invalidateQueries({ queryKey: ['group-expenses', groupId] }),
      queryClient?.invalidateQueries({ queryKey: ['groups-list'] }),
      queryClient?.invalidateQueries({ queryKey: ['home-summary'] }),
    ]);
    return result;
  } catch (error) {
    if (!isBrowser() || navigator.onLine === false) {
      createOfflineExpenseQueueItem(groupId, payload);
      emitQueueChange();
      toast.success('Se guardó sin conexión y se sincronizará luego');
      return { id: clientMutationId, queued: true };
    }

    throw error;
  }
}

export function useOfflineExpenseSync(
  queryClient: QueryClient,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      try {
        await syncQueuedOfflineExpenses(queryClient);
      } finally {
        running = false;
      }
    };

    void run();

    const handleOnline = () => {
      void run();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void run();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, queryClient]);
}

export function useOfflineExpenseQueue(groupId: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!isBrowser()) {
        return () => undefined;
      }

      const handleChange = () => onStoreChange();

      window.addEventListener(STORAGE_EVENT, handleChange);
      window.addEventListener('storage', handleChange);

      return () => {
        window.removeEventListener(STORAGE_EVENT, handleChange);
        window.removeEventListener('storage', handleChange);
      };
    },
    () => readQueue().filter((item) => item.groupId === groupId),
    () => [],
  );
}
