import { createCollection, localStorageCollectionOptions } from '@tanstack/db';

export type HomeApiResponse = {
  groups: Array<{
    id: string;
    name: string;
    type: string;
    description: string | null;
    imageUrl: string | null;
    createdAt: string;
    members: Array<{
      id: string;
      name: string;
      image: string | null;
    }>;
    currentUser: {
      memberId: string;
      name: string;
      image: string | null;
    } | null;
    hasExpenses: boolean;
    participantBalances: Array<{
      memberId: string;
      memberName: string;
      currency: string;
      amount: number;
      direction: 'theyOweYou' | 'youOweThem';
      label: string;
    }>;
    totalsByCurrency: Record<string, number>;
  }>;
  goals: Array<{
    id: string;
    title: string;
    description: string | null;
    currency: string;
    targetAmount: number;
    savedAmount: number;
    progress: number;
    endDate: string;
    createdAt: string;
    group: {
      id: string;
      name: string;
    };
  }>;
};

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
