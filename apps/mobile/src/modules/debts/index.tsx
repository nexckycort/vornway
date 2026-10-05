import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { debtsClient } from '@/api/debts';
import { usersClient } from '@/api/users';
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
import { useI18n } from '@/lib/i18n';

import { formatDebtAmount } from './format';

type Debt = {
  id: string;
  name: string;
  counterpartyName: string;
  remainingAmount: number;
  currency: string;
  direction: string;
  status: string;
  expectedTotal?: number;
  paidAmount?: number;
  amounts?: Array<{ amount: number; loanDate: string }>;
  payments?: Array<{ amount: number; paidAt: string }>;
};
type DebtFilter = 'active' | 'all' | 'paid';
export default function DebtsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [person, setPerson] = useState('');
  const [counterpartyId, setCounterpartyId] = useState<string>();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const [loanDate, setLoanDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
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
  const userSearch = useQuery({
    queryKey: ['debt-counterparty-search', person.trim()],
    enabled: person.trim().length > 1 && !counterpartyId,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: person.trim() },
      });
      if (!response.ok) throw new Error('user_search_failed');
      return response.json();
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
          ...(counterpartyId ? { counterpartyId } : {}),
          direction,
          principalAmount: value,
          amounts: [{ amount: value, loanDate }],
          interestType: 'none',
          currency: 'COP',
          ...(dueDate ? { dueDate } : {}),
          ...(note.trim() ? { description: note.trim() } : {}),
        },
      });
      if (!response.ok) throw new Error('create_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setOpen(false);
      setName('');
      setPerson('');
      setCounterpartyId(undefined);
      setAmount('');
      setDirection('lent');
      setLoanDate(today());
      setDueDate('');
      setNote('');
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
        title={t('debts.title')}
        action={
          <Button size="sm" onPress={() => setOpen(true)}>
            <Text style={styles.buttonText}>＋ {t('debts.create')}</Text>
          </Button>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>
            {t('debts.receivable').toUpperCase()}
          </Text>
          <Text style={styles.summaryAmount}>
            {formatDebtAmount(receivable, 'COP')}
          </Text>
          <Text style={styles.copy}>
            {activeCount} {t('debts.activeDebts')}
          </Text>
        </Card>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(
            [
              ['active', t('debts.filterActive')],
              ['all', t('debts.filterAll')],
              ['paid', t('debts.filterPaid')],
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
            <Text style={styles.title}>{t('debts.loadError')}</Text>
            <Button onPress={() => void debtsQuery.refetch()}>
              <Text style={styles.buttonText}>{t('common.retry')}</Text>
            </Button>
          </Card>
        ) : visibleDebts.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>{t('debts.empty')}</Text>
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
                    ? `${t('debts.lentTo')} ${item.counterpartyName}`
                    : `${t('debts.borrowedFrom')} ${item.counterpartyName}`}
                </Text>
                <Text style={styles.amount}>
                  {formatDebtAmount(item.remainingAmount, item.currency)}
                </Text>
                <Text style={styles.copy}>
                  {progressFor(item)}% {t('debts.paid').toLowerCase()}
                </Text>
                <Text style={styles.copy}>
                  {lastActivity(item) ?? t('debts.noActivity')}
                </Text>
              </Button>
            </Card>
          ))
        )}
      </ScrollView>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('debts.newTitle')}</DrawerTitle>
          </DrawerHeader>
          <Input
            value={name}
            onChangeText={setName}
            placeholder={t('debts.namePlaceholder')}
          />
          <Input
            value={person}
            onChangeText={(value) => {
              setPerson(value);
              setCounterpartyId(undefined);
            }}
            placeholder={t('debts.personPlaceholder')}
          />
          {userSearch.data?.data?.length && !counterpartyId
            ? userSearch.data.data.map((user) => (
                <Button
                  key={user.id}
                  variant="outline"
                  onPress={() => {
                    setCounterpartyId(user.id);
                    setPerson(user.name);
                  }}
                >
                  <Text style={styles.outlineText}>{user.name}</Text>
                </Button>
              ))
            : null}
          <Text style={styles.fieldLabel}>{t('debts.title')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Button
              variant={direction === 'lent' ? 'default' : 'outline'}
              onPress={() => setDirection('lent')}
            >
              <Text
                style={
                  direction === 'lent' ? styles.buttonText : styles.outlineText
                }
              >
                {t('debts.lent')}
              </Text>
            </Button>
            <Button
              variant={direction === 'borrowed' ? 'default' : 'outline'}
              onPress={() => setDirection('borrowed')}
            >
              <Text
                style={
                  direction === 'borrowed'
                    ? styles.buttonText
                    : styles.outlineText
                }
              >
                {t('debts.borrowed')}
              </Text>
            </Button>
          </ScrollView>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={t('debts.amountPlaceholder')}
          />
          <Input
            value={loanDate}
            onChangeText={setLoanDate}
            placeholder={t('debts.amountDate')}
          />
          <Input
            value={dueDate}
            onChangeText={setDueDate}
            placeholder={t('debts.dueDate')}
          />
          <Input
            value={note}
            onChangeText={setNote}
            placeholder={t('debts.descriptionPlaceholder')}
            multiline
          />
          <DrawerFooter>
            <Button
              disabled={createMutation.isPending}
              onPress={() =>
                createMutation.mutate(undefined, {
                  onError: () =>
                    Alert.alert(t('debts.createError'), t('common.retry')),
                })
              }
            >
              <Text style={styles.buttonText}>{t('debts.save')}</Text>
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
  outlineText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  fieldLabel: { color: '#64748B', fontSize: 12, fontWeight: '600' },
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function progressFor(debt: Debt) {
  if (!debt.expectedTotal || debt.expectedTotal <= 0) return 0;
  return Math.round(
    Math.min(
      100,
      Math.max(0, ((debt.paidAmount ?? 0) / debt.expectedTotal) * 100),
    ),
  );
}

function lastActivity(debt: Debt) {
  const payment = debt.payments
    ?.slice()
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0];
  const loan = debt.amounts
    ?.slice()
    .sort((a, b) => b.loanDate.localeCompare(a.loanDate))[0];
  if (!payment && !loan) return null;
  if (payment && (!loan || payment.paidAt > loan.loanDate)) {
    return `Abono · ${payment.amount} COP · ${payment.paidAt}`;
  }
  return `Préstamo · ${loan?.amount ?? 0} COP · ${loan?.loanDate ?? ''}`;
}
