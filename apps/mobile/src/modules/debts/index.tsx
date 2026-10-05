import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
type DebtFilter = 'active' | 'all' | 'paid';
export default function DebtsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [filter, setFilter] = useState<DebtFilter>('active');
  const debtsQuery = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const response = await debtsClient.index.$get({
        query: { status: 'all' },
      });
      if (!response.ok) throw new Error('debts_load_failed');
      return (await response.json()) as Debt[];
    },
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(',', '.'));
      if (
        !name.trim() ||
        !person.trim() ||
        !Number.isFinite(value) ||
        value <= 0
      )
        throw new Error('invalid');
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
      if (!response.ok) throw new Error('create_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      setOpen(false);
      setName('');
      setPerson('');
      setAmount('');
    },
  });
  const debts = debtsQuery.data ?? [];
  const visibleDebts = debts.filter((item) =>
    filter === 'all'
      ? true
      : filter === 'paid'
        ? item.status === 'paid'
        : item.status !== 'paid',
  );
  const receivable = debts
    .filter((item) => item.direction === 'lent' && item.status !== 'paid')
    .reduce((total, item) => total + item.remainingAmount, 0);
  const activeCount = debts.filter((item) => item.status !== 'paid').length;
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
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>POR COBRAR</Text>
          <Text style={styles.summaryAmount}>{receivable} COP</Text>
          <Text style={styles.copy}>{activeCount} deudas activas</Text>
        </Card>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(
            [
              ['active', 'Activas'],
              ['all', 'Todas'],
              ['paid', 'Pagadas'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? 'default' : 'outline'}
              onPress={() => setFilter(value)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter !== value && styles.filterTextOutline,
                ]}
              >
                {label}
              </Text>
            </Button>
          ))}
        </ScrollView>
        {debtsQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : debtsQuery.isError ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No se pudieron cargar las deudas</Text>
            <Button onPress={() => void debtsQuery.refetch()}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : visibleDebts.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No tienes deudas activas</Text>
            <Text style={styles.copy}>
              Registra préstamos o dinero pendiente.
            </Text>
          </Card>
        ) : (
          visibleDebts.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Button
                variant="ghost"
                onPress={() => router.push(`/debts/${item.id}` as never)}
              >
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.copy}>
                  {item.direction === 'lent'
                    ? `Te debe ${item.counterpartyName}`
                    : `Debes a ${item.counterpartyName}`}
                </Text>
                <Text style={styles.amount}>
                  {item.remainingAmount} {item.currency}
                </Text>
              </Button>
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
            <Button
              disabled={createMutation.isPending}
              onPress={() =>
                createMutation.mutate(undefined, {
                  onError: () =>
                    Alert.alert(
                      'No se pudo crear',
                      'Revisa los datos e intenta nuevamente.',
                    ),
                })
              }
            >
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
  summary: { gap: 4, padding: 18 },
  summaryLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  summaryAmount: { color: '#0F172A', fontSize: 28, fontWeight: '600' },
  filters: { gap: 8, paddingVertical: 2 },
  filterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filterTextOutline: { color: '#0F172A' },
  card: { gap: 8, padding: 8 },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  amount: { color: '#DE034D', fontSize: 20, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
