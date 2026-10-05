import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

import { groupsClient } from '@/api/groups';

type ExpensePayload = Record<string, unknown>;
export type PendingExpense = {
  id: string;
  groupId: string;
  payload: ExpensePayload;
  createdAt: string;
};

const STORAGE_KEY = 'vornway:offline:pending-expenses';

async function readQueue(): Promise<PendingExpense[]> {
  const value = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingExpense[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingExpense[]) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(queue));
}

export async function getPendingExpenses() {
  return readQueue();
}

export async function enqueueExpense(groupId: string, payload: ExpensePayload) {
  const pending: PendingExpense = {
    id: `offline-expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    groupId,
    payload: { ...payload, attachmentImage: undefined },
    createdAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(pending);
  if (serialized.length > 1800) throw new Error('offline_payload_too_large');
  const queue = await readQueue();
  await writeQueue([...queue, pending]);
  return pending;
}

export async function syncPendingExpenses() {
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) return;
  const queue = await readQueue();
  if (queue.length === 0) return;

  const remaining: PendingExpense[] = [];
  for (const item of queue) {
    try {
      const response = await groupsClient[':id'].expenses.$post({
        param: { id: item.groupId },
        json: item.payload as never,
      });
      if (!response.ok) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  await writeQueue(remaining);
}
