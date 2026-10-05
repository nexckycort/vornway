import * as SecureStore from 'expo-secure-store';

export type CachedGroup = {
  id: string;
  name: string;
  description?: string | null;
  type?: string;
  imageUrl?: string | null;
  createdAt?: string;
  members?: Array<{ id: string; name: string; image: string | null }>;
  participantBalances?: Array<{
    memberName?: string;
    currency?: string;
    label: string;
    direction?: 'theyOweYou' | 'youOweThem';
    amount?: number;
  }>;
  hasExpenses?: boolean;
};

const STORAGE_KEY = 'vornway:cache:groups-list';

export async function readCachedGroups(): Promise<CachedGroup[]> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as CachedGroup[]) : [];
  } catch {
    return [];
  }
}

export async function cacheGroups(groups: CachedGroup[]) {
  if (groups.length === 0) return;
  const current = await readCachedGroups();
  const merged = new Map(current.map((group) => [group.id, group]));
  for (const group of groups) merged.set(group.id, group);
  await SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify([...merged.values()]),
  );
}
