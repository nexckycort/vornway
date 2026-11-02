import { createCollection, localStorageCollectionOptions } from '@tanstack/db';
import type { ApiSuccess } from '@vornway/api-client';

// Copies read back from storage are JSON, so their dates are ISO strings; consumers only format them.
export type HomeApiResponse = ApiSuccess<'home', 'summary'>;

type CachedHomeSummary = {
  id: 'home-summary';
  payload: HomeApiResponse;
  updatedAt: string;
};

export const homeSummaryCollection = createCollection(
  localStorageCollectionOptions<CachedHomeSummary>({
    id: 'cached-home-summary',
    storageKey: 'vornway.home.summary-cache',
    getKey: (item) => item.id,
  }),
);

export async function getCachedHomeSummary(): Promise<
  HomeApiResponse | undefined
> {
  await homeSummaryCollection.preload();
  return homeSummaryCollection.get('home-summary')?.payload;
}

export async function upsertCachedHomeSummary(payload: HomeApiResponse) {
  await homeSummaryCollection.preload();

  const current = homeSummaryCollection.get('home-summary');
  if (current) {
    const tx = homeSummaryCollection.update('home-summary', (draft) => {
      draft.payload = payload;
      draft.updatedAt = new Date().toISOString();
    });
    await tx.isPersisted.promise;
    return;
  }

  const tx = homeSummaryCollection.insert({
    id: 'home-summary',
    payload,
    updatedAt: new Date().toISOString(),
  });
  await tx.isPersisted.promise;
}
