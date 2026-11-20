import Constants from 'expo-constants';
import type { AppExtra } from '../../app.config.ts';

const extra = Constants.expoConfig?.extra as AppExtra | undefined;
if (!extra) throw new Error('Missing extra in app config');

function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example`);
  }
  return value;
}

export const env = {
  appVariant: extra.appVariant,
  apiUrl: required('EXPO_PUBLIC_API_URL', extra.apiUrl),
};
