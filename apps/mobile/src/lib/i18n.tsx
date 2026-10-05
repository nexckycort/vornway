import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type AppLocale = keyof typeof languages;
type Messages = typeof es;
type MessagePath<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${MessagePath<T[K]>}`
        : K;
    }[keyof T & string]
  : never;

export type MessageKey = MessagePath<Messages>;
type LocaleContextValue = {
  locale: AppLocale;
  isLoading: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const LOCALE_STORAGE_KEY = 'vornway-locale';
const LocaleContext = createContext<LocaleContextValue | null>(null);

function getMessage(locale: AppLocale, key: string) {
  const source = locale === 'en' ? en : es;
  return key.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, source);
}

function interpolate(value: string, values?: Record<string, string | number>) {
  if (!values) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? `{${key}}`),
  );
}

async function readLocale() {
  try {
    const value =
      Platform.OS === 'web'
        ? typeof window !== 'undefined'
          ? window.localStorage.getItem(LOCALE_STORAGE_KEY)
          : null
        : await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
    return value === 'en' ? 'en' : value === 'es' ? 'es' : null;
  } catch {
    return null;
  }
}

async function persistLocale(locale: AppLocale) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      }
    } else {
      await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, locale);
    }
  } catch {
    // Locale persistence is best effort and must not block the UI.
  }
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<AppLocale>('es');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void readLocale().then((storedLocale) => {
      if (!active) return;
      if (storedLocale) setLocaleState(storedLocale);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    await persistLocale(nextLocale);
  }, []);

  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => {
      const message = getMessage(locale, key);
      return interpolate(
        typeof message === 'string' ? message : String(key),
        values,
      );
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, isLoading, setLocale, t }),
    [isLoading, locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useI18n must be used within LocaleProvider');
  }
  return context;
}

export function formatCurrency(
  currency: string,
  amount: number,
  locale: AppLocale = 'es',
) {
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(locale === 'en' ? 'en-US' : 'es-CO')} ${currency}`;
  }
}
