import * as SecureStore from 'expo-secure-store';

import type { HomeData } from '@/modules/home/home.types';

const STORAGE_KEY = 'vornway:cache:home-summary';

export async function readCachedHomeData(): Promise<HomeData | null> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!value) return null;
    return JSON.parse(value) as HomeData;
  } catch {
    return null;
  }
}

export async function cacheHomeData(data: HomeData) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
}
