import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { debtsClient } from '@/api/debts';
import { usersClient } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';

const createAmountDraft = () => ({
  id: `${Date.now()}-${Math.random()}`,
  value: '',
  loanDate: new Date().toISOString().slice(0, 10),
});

export default function DebtCreateScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [debtName, setDebtName] = useState('');
  const [person, setPerson] = useState('');
  const [counterpartyId, setCounterpartyId] = useState<string>();
  const [amounts, setAmounts] = useState(() => [createAmountDraft()]);
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const [interest, setInterest] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const searchQuery = useQuery({
    queryKey: ['debt-counterparty-search', person.trim()],
    enabled: person.trim().length > 1 && !counterpartyId,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: person.trim() },
      });
      if (!response.ok) throw new Error('counterparty_search_failed');
      return response.json() as Promise<{
        data: Array<{
          id: string;
          name: string;
          username?: string | null;
          email?: string | null;
        }>;
      }>;
    },
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmounts = amounts
        .map((item) => ({
          amount: Number(item.value.replace(',', '.')),
          loanDate: item.loanDate,
        }))
        .filter((item) => Number.isFinite(item.amount) && item.amount > 0);
      const principalAmount = parsedAmounts.reduce(
        (total, item) => total + item.amount,
        0,
      );
      const parsedInterest = interest
        ? Number(interest.replace(',', '.'))
        : undefined;
      if (
        !debtName.trim() ||
        !person.trim() ||
        !Number.isFinite(principalAmount) ||
        principalAmount <= 0 ||
        (parsedInterest !== undefined &&
          (!Number.isFinite(parsedInterest) || parsedInterest < 0))
      )
        throw new Error('invalid');
      const response = await debtsClient.index.$post({
        json: {
          name: debtName.trim(),
          counterpartyName: person.trim(),
          ...(counterpartyId ? { counterpartyId } : {}),
          direction,
          principalAmount,
          amounts: parsedAmounts,
          interestType: parsedInterest !== undefined ? 'percentage' : 'none',
          ...(parsedInterest !== undefined
            ? { interestValue: parsedInterest }
            : {}),
          currency: 'COP',
          ...(dueDate ? { dueDate } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
        },
      });
      if (!response.ok) throw new Error('failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      router.replace('/debts' as never);
    },
  });
  return (
    <Screen>
      <ScreenHeader
        title={t('debts.newTitle')}
        onBack={() => router.replace('/debts' as never)}
      />
      <Card style={styles.card}>
        <Label>{t('debts.namePlaceholder')}</Label>
        <Input
          value={debtName}
          onChangeText={setDebtName}
          placeholder={t('debts.namePlaceholder')}
        />
        <Label>{t('debts.personPlaceholder')}</Label>
        <Input
          value={person}
          onChangeText={(value) => {
            setPerson(value);
            setCounterpartyId(undefined);
          }}
          placeholder={t('debts.personPlaceholder')}
        />
        {searchQuery.data?.data?.map((user) => (
          <Button
            key={user.id}
            variant="outline"
            onPress={() => {
              setCounterpartyId(user.id);
              setPerson(user.name);
            }}
          >
            <Text style={styles.outlineText}>
              {user.name} · {user.username ?? user.email ?? ''}
            </Text>
          </Button>
        ))}
        <Label>{t('debts.amountPlaceholder')}</Label>
        {amounts.map((item, index) => (
          <Card key={item.id} style={styles.amountRow}>
            <Input
              value={item.value}
              onChangeText={(value) =>
                setAmounts((current) =>
                  current.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, value } : entry,
                  ),
                )
              }
              keyboardType="decimal-pad"
              placeholder={t('debts.amountPlaceholder')}
            />
            <Input
              value={item.loanDate}
              onChangeText={(loanDate) =>
                setAmounts((current) =>
                  current.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, loanDate } : entry,
                  ),
                )
              }
              placeholder="YYYY-MM-DD"
            />
            {amounts.length > 1 ? (
              <Button
                variant="ghost"
                onPress={() =>
                  setAmounts((current) =>
                    current.filter((_, entryIndex) => entryIndex !== index),
                  )
                }
              >
                <Text style={styles.hint}>{t('debts.removeAmount')}</Text>
              </Button>
            ) : null}
          </Card>
        ))}
        <Button
          variant="ghost"
          onPress={() =>
            setAmounts((current) => [...current, createAmountDraft()])
          }
        >
          <Text style={styles.outlineText}>＋ {t('debts.addAmount')}</Text>
        </Button>
        <Button
          variant={direction === 'lent' ? 'default' : 'outline'}
          onPress={() => setDirection('lent')}
        >
          <Text style={styles.buttonText}>{t('debts.lent')}</Text>
        </Button>
        <Button
          variant={direction === 'borrowed' ? 'default' : 'outline'}
          onPress={() => setDirection('borrowed')}
        >
          <Text style={styles.buttonText}>{t('debts.borrowed')}</Text>
        </Button>
        <Label>{t('debts.interestPlaceholder')}</Label>
        <Input
          value={interest}
          onChangeText={setInterest}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Label>{t('debts.dueDate')}</Label>
        <Input
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
        />
        <Label>{t('debts.descriptionLabel')}</Label>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder={t('debts.descriptionPlaceholder')}
        />
        <Button
          disabled={mutation.isPending}
          onPress={() =>
            mutation.mutate(undefined, {
              onError: () =>
                Alert.alert(t('debts.createError'), t('common.retry')),
            })
          }
        >
          {mutation.isPending ? (
            <Spinner color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{t('debts.save')}</Text>
          )}
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 18 },
  amountRow: { gap: 8, padding: 10 },
  hint: { color: '#64748B', fontSize: 12 },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
