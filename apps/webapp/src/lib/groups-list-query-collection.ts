import { createCollection } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { client, type InferResponseType } from '#/lib/hc';

const listGroupsEndpoint = client.api.groups.$get;

export type GroupsPage = InferResponseType<typeof listGroupsEndpoint>;
export type GroupListItem = GroupsPage['data'][number];
export type GroupListFilter = 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt';

const GROUPS_LIST_STORAGE_KEY = 'vornway.groups.list-cache';
const GROUPS_LIST_EVENT = 'vornway:groups-list:changed';
export const GROUPS_LIST_REFRESH_EVENT = 'vornway:groups-list:refresh';
const groupsListQueryClient = new QueryClient();
const EMPTY_GROUP_LIST_ITEMS: GroupListItem[] = [];

let cachedRawGroupsList: string | null = null;
let cachedGroupsListItems: GroupListItem[] = EMPTY_GROUP_LIST_ITEMS;

function readCachedGroupListItems(): GroupListItem[] {
  if (typeof window === 'undefined') return EMPTY_GROUP_LIST_ITEMS;

  try {
    const raw = window.localStorage.getItem(GROUPS_LIST_STORAGE_KEY);
    if (!raw) {
      cachedRawGroupsList = null;
      cachedGroupsListItems = EMPTY_GROUP_LIST_ITEMS;
      return EMPTY_GROUP_LIST_ITEMS;
    }

    if (raw === cachedRawGroupsList) {
      return cachedGroupsListItems;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedRawGroupsList = raw;
      cachedGroupsListItems = EMPTY_GROUP_LIST_ITEMS;
      return EMPTY_GROUP_LIST_ITEMS;
    }

    cachedRawGroupsList = raw;
    cachedGroupsListItems = parsed as GroupListItem[];
    return cachedGroupsListItems;
  } catch {
    return EMPTY_GROUP_LIST_ITEMS;
  }
}

function writeCachedGroupListItems(items: GroupListItem[]) {
  if (typeof window === 'undefined') return;

  const raw = JSON.stringify(items);
  window.localStorage.setItem(GROUPS_LIST_STORAGE_KEY, raw);
  cachedRawGroupsList = raw;
  cachedGroupsListItems = items.length > 0 ? items : EMPTY_GROUP_LIST_ITEMS;
  window.dispatchEvent(new CustomEvent(GROUPS_LIST_EVENT));
}

function mergeGroupListItems(
  current: GroupListItem[],
  incoming: GroupListItem[],
) {
  const byId = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values()).sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export const groupsListCollection = createCollection(
  queryCollectionOptions<GroupListItem>({
    queryKey: ['groups-list-db'],
    queryClient: groupsListQueryClient,
    queryFn: async () => readCachedGroupListItems(),
    getKey: (item) => item.id,
    staleTime: Number.POSITIVE_INFINITY,
  }),
);

export function getCachedGroupListItems(): GroupListItem[] {
  return readCachedGroupListItems();
}

export function getEmptyGroupListItems(): GroupListItem[] {
  return EMPTY_GROUP_LIST_ITEMS;
}

export function subscribeGroupListItems(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  void groupsListCollection.preload().then(callback);

  const subscription = groupsListCollection.subscribeChanges(
    () => {
      callback();
    },
    { includeInitialState: true },
  );

  const handleStorage = (event: StorageEvent) => {
    if (event.key === GROUPS_LIST_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(GROUPS_LIST_EVENT, callback as EventListener);

  return () => {
    subscription.unsubscribe();
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(GROUPS_LIST_EVENT, callback as EventListener);
  };
}

export function upsertGroupListItems(items: GroupListItem[]) {
  if (items.length === 0) return;

  const nextItems = mergeGroupListItems(readCachedGroupListItems(), items);
  writeCachedGroupListItems(nextItems);

  void groupsListCollection.preload().then(() => {
    groupsListCollection.utils.writeUpsert(items);
  });
}

export function removeCachedGroupListItem(groupId: string) {
  const nextItems = readCachedGroupListItems().filter(
    (item) => item.id !== groupId,
  );

  writeCachedGroupListItems(nextItems);

  void groupsListCollection.preload().then(() => {
    groupsListCollection.utils.writeDelete([groupId]);
  });
}
