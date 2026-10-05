import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { debtsClient } from '@/api/debts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Debt = {
  id: string;
  name: string;
  counterpartyName: string;
  remainingAmount: number;
  currency: string;
  direction: string;
  status: string;
};
export default function DebtsScreen() {
  const [items, setItems] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const load = useCallback(async () => {
    const response = await debtsClient.index.$get({ query: { status: 'all' } });
    if (response.ok) setItems((await response.json()) as Debt[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function create() {
    const value = Number(amount.replace(',', '.'));
    if (!name.trim() || !person.trim() || !Number.isFinite(value) || value <= 0)
      return;
    const response = await debtsClient.index.$post({
      json: {
        name: name.trim(),
        counterpartyName: person.trim(),
        direction: 'lent',
        principalAmount: value,
        amounts: [
          { amount: value, loanDate: new Date().toISOString().slice(0, 10) },
        ],
        interestType: 'none',
        currency: 'COP',
      },
    });
    if (!response.ok) {
      Alert.alert('No se pudo crear', 'Intenta nuevamente.');
      return;
    }
    setOpen(false);
    setName('');
    setPerson('');
    setAmount('');
    void load();
  }
  const active = items.filter((item) => item.status !== 'paid');
  return (
    <Screen>
      <ScreenHeader
        title="Deudas"
        action={
          <Button size="sm" onPress={() => setOpen(true)}>
            <Text style={styles.buttonText}>＋ Nueva</Text>
          </Button>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Spinner color="#DE034D" />
        ) : active.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No tienes deudas activas</Text>
            <Text style={styles.copy}>
              Registra préstamos o dinero pendiente.
            </Text>
          </Card>
        ) : (
          active.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.copy}>
                {item.direction === 'lent'
                  ? `Te debe ${item.counterpartyName}`
                  : `Debes a ${item.counterpartyName}`}
              </Text>
              <Text style={styles.amount}>
                {item.remainingAmount} {item.currency}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Nueva deuda</DrawerTitle>
          </DrawerHeader>
          <Input value={name} onChangeText={setName} placeholder="Nombre" />
          <Input
            value={person}
            onChangeText={setPerson}
            placeholder="Persona"
          />
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="Monto"
          />
          <DrawerFooter>
            <Button onPress={() => void create()}>
              <Text style={styles.buttonText}>Guardar</Text>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 152 },
  card: { gap: 8, padding: 16 },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  amount: { color: '#DE034D', fontSize: 20, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
