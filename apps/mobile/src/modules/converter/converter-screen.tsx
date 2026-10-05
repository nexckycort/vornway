import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { converterClient } from '@/api/converter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type ConverterData = {
  currencies: string[];
  rates: Array<{ baseCurrency: string; quoteCurrency: string; rate: number }>;
  disclaimer?: string;
  lastUpdatedAt?: string | null;
};
export default function ConverterScreen() {
  const router = useRouter();
  const [data, setData] = useState<ConverterData | null>(null);
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('COP');
  useEffect(() => {
    void converterClient.index.$get().then(async (response) => {
      if (response.ok) setData((await response.json()) as ConverterData);
    });
  }, []);
  const currencies = data?.currencies ?? ['EUR', 'COP', 'USD'];
  const rate = useMemo(
    () =>
      data?.rates.find(
        (item) => item.baseCurrency === from && item.quoteCurrency === to,
      )?.rate,
    [data?.rates, from, to],
  );
  const value = Number(amount.replace(',', '.'));
  const converted = from === to ? value : rate ? value * rate : null;
  function cycle(current: string, setter: (value: string) => void) {
    const next =
      currencies[(currencies.indexOf(current) + 1) % currencies.length];
    if (next) setter(next);
  }
  return (
    <Screen>
      <ScreenHeader title="Conversor" onBack={() => router.back()} />
      <Card style={styles.card}>
        {!data ? (
          <Spinner color="#DE034D" />
        ) : (
          <>
            <Text style={styles.copy}>
              Convierte monedas con la tasa más reciente.
            </Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Cantidad"
              style={styles.amount}
            />
            <Button variant="outline" onPress={() => cycle(from, setFrom)}>
              <Text style={styles.currency}>{from}</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              <Text style={styles.buttonText}>⇅ Intercambiar</Text>
            </Button>
            <Button variant="outline" onPress={() => cycle(to, setTo)}>
              <Text style={styles.currency}>{to}</Text>
            </Button>
            <Text style={styles.result}>
              {converted === null
                ? 'Tasa no disponible'
                : `${converted.toFixed(2)} ${to}`}
            </Text>
            {data.disclaimer ? (
              <Text style={styles.copy}>{data.disclaimer}</Text>
            ) : null}
          </>
        )}
      </Card>
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
});
