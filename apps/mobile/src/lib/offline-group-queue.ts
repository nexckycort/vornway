import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

import { groupsClient } from '@/api/groups';

export type OfflineGroupPayload = {
  name: string;
  type: 'espacio' | 'personal';
  description?: string;
  participants: Array<{ name: string; userId?: string }>;
};

export type PendingGroup = {
  id: string;
  payload: OfflineGroupPayload;
  createdAt: string;
};

const STORAGE_KEY = 'vornway:offline:pending-groups';

async function readQueue(): Promise<PendingGroup[]> {
  const value = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingGroup[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingGroup[]) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(queue));
}

export async function getPendingGroups() {
  return readQueue();
}

export async function enqueueGroup(payload: OfflineGroupPayload) {
  const pending: PendingGroup = {
    id: `offline-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
  };
  const queue = await readQueue();
  await writeQueue([...queue, pending]);
  return pending;
}

export async function syncPendingGroups() {
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) return;

  const queue = await readQueue();
  if (queue.length === 0) return;

  const remaining: PendingGroup[] = [];
  for (const item of queue) {
    try {
      const response = await groupsClient.index.$post({ json: item.payload });
      if (!response.ok) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  await writeQueue(remaining);
}
