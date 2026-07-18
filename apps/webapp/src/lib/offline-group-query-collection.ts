import { createCollection } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { groupsClient } from '#/api/groups';
import type { InferRequestType } from '#/api/types';
import { GROUPS_LIST_REFRESH_EVENT } from '#/lib/groups-list-query-collection';
import { m } from '#/paraglide/messages.js';

const createGroupEndpoint = groupsClient.index.$post;

export type CreateGroupPayload = InferRequestType<
  typeof createGroupEndpoint
>['json'];

export type PendingGroup = {
  id: string;
  payload: CreateGroupPayload;
  createdAt: string;
};

type LocalGroupFallback = PendingGroup & {
  retainedAt: string;
};

export type CreateGroupOfflineFirstResult =
  | {
      id: string;
      name: string;
      inviteCode: string;
      queued?: false;
    }
  | {
      id: string;
      name: string;
      queued: true;
    };

const OFFLINE_GROUPS_STORAGE_KEY = 'vornway.offline.pending-groups';
const OFFLINE_GROUP_FALLBACKS_STORAGE_KEY = 'vornway.offline.group-fallbacks';
const OFFLINE_GROUPS_EVENT = 'vornway:offline-groups:changed';
const LOCAL_GROUP_FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const offlineGroupsQueryClient = new QueryClient();
const EMPTY_PENDING_GROUPS: PendingGroup[] = [];
const EMPTY_LOCAL_GROUP_FALLBACKS: LocalGroupFallback[] = [];

let cachedRawPendingGroups: string | null = null;
let cachedPendingGroups: PendingGroup[] = EMPTY_PENDING_GROUPS;
let cachedRawLocalGroupFallbacks: string | null = null;
let cachedLocalGroupFallbacks: LocalGroupFallback[] =
  EMPTY_LOCAL_GROUP_FALLBACKS;

function stripUnsupportedOfflineFields(
  payload: CreateGroupPayload,
): CreateGroupPayload {
  const { image: _image, ...rest } = payload;
  return rest;
}

function readPendingGroups(): PendingGroup[] {
  if (typeof window === 'undefined') return EMPTY_PENDING_GROUPS;

  try {
    const raw = window.localStorage.getItem(OFFLINE_GROUPS_STORAGE_KEY);
    if (!raw) {
      cachedRawPendingGroups = null;
      cachedPendingGroups = EMPTY_PENDING_GROUPS;
      return EMPTY_PENDING_GROUPS;
    }

    if (raw === cachedRawPendingGroups) {
      return cachedPendingGroups;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedRawPendingGroups = raw;
      cachedPendingGroups = EMPTY_PENDING_GROUPS;
      return EMPTY_PENDING_GROUPS;
    }

    cachedRawPendingGroups = raw;
    cachedPendingGroups = parsed as PendingGroup[];
    return cachedPendingGroups;
  } catch {
    return EMPTY_PENDING_GROUPS;
  }
}

function writePendingGroups(next: PendingGroup[]) {
  if (typeof window === 'undefined') return;

  const raw = JSON.stringify(next);
  window.localStorage.setItem(OFFLINE_GROUPS_STORAGE_KEY, raw);
  cachedRawPendingGroups = raw;
  cachedPendingGroups = next.length > 0 ? next : EMPTY_PENDING_GROUPS;
  window.dispatchEvent(new CustomEvent(OFFLINE_GROUPS_EVENT));
}

function readLocalGroupFallbacks(): LocalGroupFallback[] {
  if (typeof window === 'undefined') return EMPTY_LOCAL_GROUP_FALLBACKS;

  try {
    const raw = window.localStorage.getItem(
      OFFLINE_GROUP_FALLBACKS_STORAGE_KEY,
    );
    if (!raw) {
      cachedRawLocalGroupFallbacks = null;
      cachedLocalGroupFallbacks = EMPTY_LOCAL_GROUP_FALLBACKS;
      return EMPTY_LOCAL_GROUP_FALLBACKS;
    }

    if (raw === cachedRawLocalGroupFallbacks) {
      return cachedLocalGroupFallbacks;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedRawLocalGroupFallbacks = raw;
      cachedLocalGroupFallbacks = EMPTY_LOCAL_GROUP_FALLBACKS;
      return EMPTY_LOCAL_GROUP_FALLBACKS;
    }

    cachedRawLocalGroupFallbacks = raw;
    cachedLocalGroupFallbacks = parsed as LocalGroupFallback[];
    return cachedLocalGroupFallbacks;
  } catch {
    return EMPTY_LOCAL_GROUP_FALLBACKS;
  }
}

function writeLocalGroupFallbacks(next: LocalGroupFallback[]) {
  if (typeof window === 'undefined') return;

  const raw = JSON.stringify(next);
  window.localStorage.setItem(OFFLINE_GROUP_FALLBACKS_STORAGE_KEY, raw);
  cachedRawLocalGroupFallbacks = raw;
  cachedLocalGroupFallbacks =
    next.length > 0 ? next : EMPTY_LOCAL_GROUP_FALLBACKS;
}

function pruneLocalGroupFallbacks(groups: LocalGroupFallback[]) {
  const now = Date.now();
  return groups.filter((group) => {
    const retainedAt = new Date(group.retainedAt).getTime();
    if (Number.isNaN(retainedAt)) return false;
    return now - retainedAt <= LOCAL_GROUP_FALLBACK_MAX_AGE_MS;
  });
}

function upsertLocalGroupFallback(group: PendingGroup) {
  const retainedAt = new Date().toISOString();
  const existing = pruneLocalGroupFallbacks(readLocalGroupFallbacks()).filter(
    (item) => item.id !== group.id,
  );

  writeLocalGroupFallbacks([
    ...existing,
    {
      ...group,
      retainedAt,
    },
  ]);
}

function buildLocalGroupId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function enqueuePendingGroup(payload: CreateGroupPayload) {
  const localId = payload.id ?? buildLocalGroupId();
  const offlinePayload = stripUnsupportedOfflineFields({
    ...payload,
    id: localId,
  });

  const pendingGroup = {
    id: localId,
    payload: offlinePayload,
    createdAt: new Date().toISOString(),
  };

  writePendingGroups([...readPendingGroups(), pendingGroup]);
  upsertLocalGroupFallback(pendingGroup);

  return localId;
}

function removePendingGroup(id: string) {
  writePendingGroups(readPendingGroups().filter((item) => item.id !== id));
}

async function postGroupToApi(payload: CreateGroupPayload) {
  const request = createGroupEndpoint({
    json: payload,
  });

  const timeout = new Promise<never>((_, reject) => {
    const timer = globalThis.setTimeout(() => {
      clearTimeout(timer);
      reject(new Error('REQUEST_TIMEOUT'));
    }, 1500);
  });

  return Promise.race([request, timeout]);
}

export const pendingGroupsCollection = createCollection(
  queryCollectionOptions<PendingGroup>({
    queryKey: ['offline-pending-groups'],
    queryClient: offlineGroupsQueryClient,
    queryFn: async () => readPendingGroups(),
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const additions = (
        transaction.mutations as Array<{ modified: PendingGroup }>
      ).map((mutation) => mutation.modified);
      writePendingGroups([...readPendingGroups(), ...additions]);
      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      const deletions = new Set(
        (transaction.mutations as Array<{ key: string }>).map((mutation) =>
          String(mutation.key),
        ),
      );
      writePendingGroups(
        readPendingGroups().filter((item) => !deletions.has(item.id)),
      );
      return { refetch: false };
    },
  }),
);

let isSyncingQueue = false;
let isSyncListenerRegistered = false;

export function getPendingGroups(): PendingGroup[] {
  return readPendingGroups();
}

export function getPendingGroupsCount(): number {
  return readPendingGroups().length;
}

export function getPendingGroupById(groupId: string): PendingGroup | null {
  return readPendingGroups().find((group) => group.id === groupId) ?? null;
}

export function getLocalGroupById(groupId: string): PendingGroup | null {
  return (
    getPendingGroupById(groupId) ??
    pruneLocalGroupFallbacks(readLocalGroupFallbacks()).find(
      (group) => group.id === groupId,
    ) ??
    null
  );
}

export function removeLocalGroupFallback(groupId: string) {
  writeLocalGroupFallbacks(
    readLocalGroupFallbacks().filter((group) => group.id !== groupId),
  );
}

export function getEmptyPendingGroups(): PendingGroup[] {
  return EMPTY_PENDING_GROUPS;
}

export function enqueueGroupOffline(payload: CreateGroupPayload): {
  id: string;
  name: string;
  queued: true;
} {
  const localId = enqueuePendingGroup(payload);
  return { id: localId, name: payload.name, queued: true };
}

export function subscribePendingGroups(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === OFFLINE_GROUPS_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(OFFLINE_GROUPS_EVENT, callback as EventListener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(OFFLINE_GROUPS_EVENT, callback as EventListener);
  };
}

export async function syncPendingGroupsQueue() {
  if (typeof window === 'undefined') return;
  if (!navigator.onLine) return;
  if (isSyncingQueue) return;

  const pending = readPendingGroups();
  if (pending.length === 0) return;

  isSyncingQueue = true;

  try {
    for (const item of pending) {
      try {
        const response = await postGroupToApi(item.payload);

        if (response.ok) {
          removePendingGroup(item.id);
          window.dispatchEvent(new CustomEvent(GROUPS_LIST_REFRESH_EVENT));
          continue;
        }

        if (response.status >= 400 && response.status < 500) {
          removePendingGroup(item.id);
        }
      } catch {
        break;
      }
    }
  } finally {
    isSyncingQueue = false;
  }
}

export function initOfflineGroupQueueSync() {
  if (typeof window === 'undefined') return;
  if (isSyncListenerRegistered) return;

  isSyncListenerRegistered = true;

  window.addEventListener('online', () => {
    void syncPendingGroupsQueue();
  });

  void syncPendingGroupsQueue();
}

export async function createGroupOfflineFirst(
  payload: CreateGroupPayload,
): Promise<CreateGroupOfflineFirstResult> {
  if (typeof window === 'undefined') {
    const response = await postGroupToApi(payload);
    if (!response.ok) {
      throw new Error(m['system.createGroupFailed']());
    }

    const data = (await response.json()) as CreateGroupOfflineFirstResult;
    return data;
  }

  if (!navigator.onLine) {
    return enqueueGroupOffline(payload);
  }

  let response: Awaited<ReturnType<typeof postGroupToApi>>;
  try {
    response = await postGroupToApi(payload);
  } catch {
    return enqueueGroupOffline(payload);
  }

  if (response.ok) {
    const data = (await response.json()) as CreateGroupOfflineFirstResult;
    return data;
  }

  if (response.status >= 500) {
    return enqueueGroupOffline(payload);
  }

  const payloadError = (await response.json()) as { error?: string };
  throw new Error(payloadError.error ?? m['system.createGroupFailed']());
}
