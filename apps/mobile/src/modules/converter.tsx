import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { converterClient } from '@/api/converter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';

type ConverterData = {
  currencies: string[];
  rates: Array<{
    baseCurrency: string;
    quoteCurrency: string;
    rate: number;
    effectiveDate?: string;
    createdAt?: string;
  }>;
  disclaimer?: string;
  lastUpdatedAt?: string | null;
};
export default function ConverterScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('COP');
  const [currencyDrawer, setCurrencyDrawer] = useState<'from' | 'to' | null>(
    null,
  );
  const converterQuery = useQuery({
    queryKey: ['currency-converter'],
    queryFn: async () => {
      const response = await converterClient.index.$get();
      if (!response.ok) throw new Error('converter_load_failed');
      return (await response.json()) as ConverterData;
    },
  });
  const data = converterQuery.data;
  const currencies = data?.currencies ?? ['EUR', 'COP', 'USD'];
  const rate = useMemo(
    () =>
      data?.rates.find(
        (item) => item.baseCurrency === from && item.quoteCurrency === to,
      )?.rate,
    [data?.rates, from, to],
  );
  const parsedValue = Number(amount.replace(',', '.'));
  const value = Number.isFinite(parsedValue) ? parsedValue : 0;
  const converted = from === to ? value : rate ? value * rate : null;
  const selectedRate = data?.rates.find(
    (item) => item.baseCurrency === from && item.quoteCurrency === to,
  );
  const currencyMeta = (currency: string) =>
    currency === 'COP'
      ? '🇨🇴'
      : currency === 'USD'
        ? '🇺🇸'
        : currency === 'EUR'
          ? '🇪🇺'
          : currency === 'GBP'
            ? '🇬🇧'
            : currency === 'MXN'
              ? '🇲🇽'
              : currency === 'BRL'
                ? '🇧🇷'
                : '💱';
  return (
    <Screen>
      <ScreenHeader title={t('converter.title')} onBack={() => router.back()} />
      <Card style={styles.card}>
        {converterQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : converterQuery.isError ? (
          <>
            <Text style={styles.copy}>{t('converter.loadErrorTitle')}</Text>
            <Button onPress={() => converterQuery.refetch()}>
              <Text style={styles.buttonText}>{t('common.retry')}</Text>
            </Button>
          </>
        ) : !data ? (
          <Spinner color="#DE034D" />
        ) : (
          <>
            <Text style={styles.copy}>{t('converter.subtitle')}</Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={t('converter.amount')}
              style={styles.amount}
            />
            <Button variant="outline" onPress={() => setCurrencyDrawer('from')}>
              <Text style={styles.currency}>
                {currencyMeta(from)} {from}
              </Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              <Text style={styles.buttonText}>
                ⇅ {t('converter.conversion')}
              </Text>
            </Button>
            <Button variant="outline" onPress={() => setCurrencyDrawer('to')}>
              <Text style={styles.currency}>
                {currencyMeta(to)} {to}
              </Text>
            </Button>
            <Text style={styles.result}>
              {converted === null
                ? t('converter.noRateAvailable')
                : formatMoney(converted, to)}
            </Text>
            <Text style={styles.copy}>
              {from === to
                ? t('converter.sameCurrency')
                : selectedRate
                  ? `1 ${from} = ${selectedRate.rate} ${to}`
                  : t('converter.missingRatePair', { from, to })}
            </Text>
            {data.disclaimer ? (
              <Text style={styles.copy}>{data.disclaimer}</Text>
            ) : null}
            {data.lastUpdatedAt ? (
              <Text style={styles.updatedAt}>
                {t('converter.lastUpdated')}:{' '}
                {new Date(data.lastUpdatedAt).toLocaleDateString(
                  locale === 'en' ? 'en-US' : 'es-CO',
                  {
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                  },
                )}
              </Text>
            ) : null}
          </>
        )}
      </Card>
      <Drawer
        open={currencyDrawer !== null}
        onOpenChange={(open) => {
          if (!open) setCurrencyDrawer(null);
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {currencyDrawer === 'from'
                ? t('converter.from')
                : t('converter.to')}
            </DrawerTitle>
          </DrawerHeader>
          {currencies.map((currency) => (
            <Button
              key={currency}
              variant={
                (currencyDrawer === 'from' ? from : to) === currency
                  ? 'default'
                  : 'outline'
              }
              onPress={() => {
                if (currencyDrawer === 'from') setFrom(currency);
                else setTo(currency);
                setCurrencyDrawer(null);
              }}
            >
              <Text style={styles.buttonText}>
                {currencyMeta(currency)} {currency}
              </Text>
            </Button>
          ))}
        </DrawerContent>
      </Drawer>
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 14, margin: 16, padding: 20 },
  amount: { fontSize: 28, height: 56 },
  currency: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  buttonText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  result: { color: '#0F172A', fontSize: 30, fontWeight: '600', marginTop: 8 },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  updatedAt: { color: '#94A3B8', fontSize: 12 },
});

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString('es-CO')} ${currency}`;
  }
}
