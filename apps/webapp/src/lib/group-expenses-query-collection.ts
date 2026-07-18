import { createCollection, localStorageCollectionOptions } from '@tanstack/db';
import { groupsClient } from '#/api/groups';
import type { InferResponseType } from '#/api/types';

const groupExpensesEndpoint = groupsClient[':id'].expenses.$get;

type GroupExpensesPageResponse = InferResponseType<
  typeof groupExpensesEndpoint
>;

export type GroupExpensesPageSuccess = Extract<
  GroupExpensesPageResponse,
  { data: unknown[]; pagination: { nextCursor: string | null } }
>;

type CachedGroupExpensesPage = {
  id: string;
  groupId: string;
  pageParam: string | null;
  page: GroupExpensesPageSuccess;
  updatedAt: string;
};

export const cachedGroupExpensesCollection = createCollection(
  localStorageCollectionOptions<CachedGroupExpensesPage>({
    id: 'cached-group-expenses',
    storageKey: 'vornway.groups.expenses-cache',
    getKey: (item) => item.id,
  }),
);

function getCachedGroupExpensesPageId(
  groupId: string,
  pageParam: string | null,
) {
  return `${groupId}:${pageParam ?? 'initial'}`;
}

export async function getCachedGroupExpensesPage(
  groupId: string,
  pageParam: string | null,
): Promise<GroupExpensesPageSuccess | undefined> {
  await cachedGroupExpensesCollection.preload();

  return cachedGroupExpensesCollection.get(
    getCachedGroupExpensesPageId(groupId, pageParam),
  )?.page;
}

export async function upsertCachedGroupExpensesPage(
  groupId: string,
  pageParam: string | null,
  page: GroupExpensesPageSuccess,
) {
  await cachedGroupExpensesCollection.preload();

  const id = getCachedGroupExpensesPageId(groupId, pageParam);
  const current = cachedGroupExpensesCollection.get(id);

  if (current) {
    const tx = cachedGroupExpensesCollection.update(id, (draft) => {
      draft.page = page;
      draft.updatedAt = new Date().toISOString();
    });
    await tx.isPersisted.promise;
    return;
  }

  const tx = cachedGroupExpensesCollection.insert({
    id,
    groupId,
    pageParam,
    page,
    updatedAt: new Date().toISOString(),
  });
  await tx.isPersisted.promise;
}
