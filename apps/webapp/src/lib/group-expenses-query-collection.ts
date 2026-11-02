import { createCollection, localStorageCollectionOptions } from '@tanstack/db';
import type { ApiSuccess, Cursor } from '@vornway/api-client';

export type GroupExpensesPageSuccess = ApiSuccess<'groups', 'listExpenses'>;

type CachedGroupExpensesPage = {
  id: string;
  groupId: string;
  pageParam: Cursor | null;
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
  pageParam: Cursor | null,
) {
  return `${groupId}:${pageParam ?? 'initial'}`;
}

export async function getCachedGroupExpensesPage(
  groupId: string,
  pageParam: Cursor | null,
): Promise<GroupExpensesPageSuccess | undefined> {
  await cachedGroupExpensesCollection.preload();

  return cachedGroupExpensesCollection.get(
    getCachedGroupExpensesPageId(groupId, pageParam),
  )?.page;
}

export async function upsertCachedGroupExpensesPage(
  groupId: string,
  pageParam: Cursor | null,
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
