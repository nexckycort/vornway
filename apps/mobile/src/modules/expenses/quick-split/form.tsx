import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { quickSplitsClient } from '@/api/quick-splits';
import { usersClient } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';

import { useUsernameRequirement } from '../../username/use-username-requirement';

type SplitMethod = 'equal' | 'percentage' | 'exact';
type Currency = 'COP' | 'USD' | 'EUR';
type ParticipantData = { name: string; userId?: string };
type ExistingQuickSplitExpense = {
  quickSplitName?: string | null;
  description: string;
  amount: number;
  currency: Currency;
  paidByParticipantId?: string | null;
  paidBy?: { id: string } | null;
  splitMethod: SplitMethod;
  metadata?: {
    category?: string;
    items?: Array<{ name: string; amount: number }>;
  } | null;
  participants: Array<{
    id: string;
    name: string;
    userId?: string | null;
    share?: number;
  }>;
};

export default function ExpenseCreateScreen() {
  const params = useLocalSearchParams<{
    from?: 'friends' | 'home';
    participants?: string;
    participantData?: string;
    quickSplitId?: string;
    expenseId?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { ensureUsername, usernameDialog } = useUsernameRequirement();
  const ownerName =
    (
      session as { user?: { name?: string | null } } | null
    )?.user?.name?.trim() || 'Tú';
  const currentUserId = (session as { user?: { id?: string | null } } | null)
    ?.user?.id;
  const isEditMode = Boolean(params.quickSplitId && params.expenseId);
  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState(params.participants ?? '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('COP');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [shareValues, setShareValues] = useState<Record<string, string>>({});
  const [payerIndex, setPayerIndex] = useState('0');
  const [participantData, setParticipantData] = useState(() =>
    parseParticipantData(params.participantData, params.participants),
  );
  const [editParticipantIds, setEditParticipantIds] = useState<string[]>([]);
  const [editHydrated, setEditHydrated] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [debouncedFriendSearch, setDebouncedFriendSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sharedItems, setSharedItems] = useState<
    Array<{ name: string; amount: string }>
  >([]);
  const expenseQuery = useQuery({
    queryKey: ['quick-split-expense', params.quickSplitId, params.expenseId],
    enabled: isEditMode,
    queryFn: async () => {
      const response = await quickSplitsClient[':id'].expenses[
        ':expenseId'
      ].$get({
        param: {
          id: params.quickSplitId ?? '',
          expenseId: params.expenseId ?? '',
        },
      });
      if (!response.ok) throw new Error('expense_load_failed');
      return (await response.json()) as unknown as ExistingQuickSplitExpense;
    },
  });
  const usersQuery = useQuery({
    queryKey: ['quick-split-user-search', debouncedFriendSearch],
    enabled: debouncedFriendSearch.length > 1,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: debouncedFriendSearch },
      });
      if (!response.ok) throw new Error('user_search_failed');
      return response.json();
    },
  });
  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedFriendSearch(friendSearch.trim()),
      250,
    );
    return () => clearTimeout(timeout);
  }, [friendSearch]);
  const friendNames = namesFromInput(participants);
  const splitParticipants = [ownerName, ...friendNames];
  useEffect(() => {
    const expense = expenseQuery.data;
    if (!isEditMode || !expense || editHydrated) return;

    const owner =
      expense.participants.find(
        (participant) =>
          participant.userId && participant.userId === currentUserId,
      ) ?? expense.participants[0];
    const orderedParticipants = owner
      ? [
          owner,
          ...expense.participants.filter(
            (participant) => participant.id !== owner.id,
          ),
        ]
      : expense.participants;
    const friends = orderedParticipants.filter(
      (participant) => participant.id !== owner?.id,
    );

    setGroupName(expense.quickSplitName ?? '');
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setCurrency(expense.currency);
    setParticipants(friends.map((participant) => participant.name).join(', '));
    setParticipantData(
      friends.map((participant) => ({
        name: participant.name,
        ...(participant.userId ? { userId: participant.userId } : {}),
      })),
    );
    setEditParticipantIds(
      orderedParticipants.map((participant) => participant.id),
    );
    setPayerIndex(
      String(
        Math.max(
          0,
          orderedParticipants.findIndex(
            (participant) =>
              participant.id ===
              (expense.paidByParticipantId ?? expense.paidBy?.id),
          ),
        ),
      ),
    );
    setSplitMethod(expense.splitMethod);
    setShareValues(
      Object.fromEntries(
        orderedParticipants.map((participant, index) => [
          String(index),
          expense.splitMethod === 'percentage'
            ? String(((participant.share ?? 0) / expense.amount) * 100)
            : expense.splitMethod === 'exact'
              ? String(participant.share ?? 0)
              : '',
        ]),
      ),
    );
    setCategory(expense.metadata?.category ?? '');
    setSharedItems(
      (expense.metadata?.items ?? []).map((item) => ({
        name: item.name,
        amount: String(item.amount),
      })),
    );
    setEditHydrated(true);
  }, [currentUserId, editHydrated, expenseQuery.data, isEditMode]);
  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = Number(amount.replace(',', '.'));
      if (isEditMode) {
        const expense = expenseQuery.data;
        if (!expense || !params.quickSplitId || !params.expenseId) {
          throw new Error('invalid');
        }
        const enteredShares = editParticipantIds.map(
          (_, index) =>
            Number((shareValues[String(index)] ?? '').replace(',', '.')) || 0,
        );
        const expectedShareTotal =
          splitMethod === 'percentage' ? 100 : parsedAmount;
        const shareTotal = enteredShares.reduce((sum, value) => sum + value, 0);
        if (
          !description.trim() ||
          !Number.isFinite(parsedAmount) ||
          parsedAmount <= 0 ||
          (splitMethod !== 'equal' &&
            Math.abs(shareTotal - expectedShareTotal) > 0.01)
        ) {
          throw new Error('invalid_split');
        }
        const metadata = {
          ...(category.trim() ? { category: category.trim() } : {}),
          ...(sharedItems.length > 0
            ? {
                items: sharedItems
                  .map((item) => ({
                    name: item.name.trim(),
                    amount: Number(item.amount.replace(',', '.')),
                  }))
                  .filter((item) => item.name && item.amount > 0),
              }
            : {}),
        };
        const response = await quickSplitsClient[':id'].expenses[
          ':expenseId'
        ].$put({
          param: { id: params.quickSplitId, expenseId: params.expenseId },
          json: {
            description: description.trim(),
            amount: parsedAmount,
            currency: expense.currency,
            paidByParticipantId:
              editParticipantIds[Number(payerIndex)] ??
              expense.paidByParticipantId ??
              expense.paidBy?.id,
            splitMethod,
            ...(splitMethod === 'percentage'
              ? {
                  percentageShares: Object.fromEntries(
                    editParticipantIds.map((participantId, index) => [
                      participantId,
                      enteredShares[index] ?? 0,
                    ]),
                  ),
                }
              : {}),
            ...(splitMethod === 'exact'
              ? {
                  exactShares: Object.fromEntries(
                    editParticipantIds.map((participantId, index) => [
                      participantId,
                      enteredShares[index] ?? 0,
                    ]),
                  ),
                }
              : {}),
            metadata,
          },
        });
        if (!response.ok) throw new Error('expense_update_failed');
        return;
      }
      const names = friendNames;
      if (
        names.length === 0 ||
        !description.trim() ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      )
        throw new Error('invalid');
      const groupResponse = await quickSplitsClient.index.$post({
        json: {
          name: groupName.trim() || description.trim(),
          participants: names.map((name) => {
            const registered = participantData.find(
              (participant) => participant.name === name,
            );
            return {
              name,
              ...(registered?.userId ? { userId: registered.userId } : {}),
            };
          }),
        },
      });
      if (!groupResponse.ok) throw new Error('group_failed');
      const group = await groupResponse.json();
      const firstParticipant = group.participants[0];
      if (!firstParticipant) throw new Error('participant_failed');
      const enteredShares = splitParticipants.map(
        (_, index) =>
          Number((shareValues[String(index)] ?? '').replace(',', '.')) || 0,
      );
      const rawShareTotal = enteredShares.reduce(
        (sum, value) => sum + value,
        0,
      );
      const expectedShareTotal =
        splitMethod === 'percentage' ? 100 : parsedAmount;
      if (
        splitMethod !== 'equal' &&
        Math.abs(rawShareTotal - expectedShareTotal) > 0.01
      )
        throw new Error('invalid_split');
      const payer = group.participants[Number(payerIndex)] ?? firstParticipant;
      const exactShares = Object.fromEntries(
        group.participants.map((participant, index) => [
          participant.id,
          splitMethod === 'percentage'
            ? (parsedAmount * enteredShares[index]) / 100
            : enteredShares[index],
        ]),
      );
      const expenseResponse = await quickSplitsClient[':id'].expenses.$post({
        param: { id: group.id },
        json: {
          description: description.trim(),
          amount: parsedAmount,
          currency,
          paidByParticipantId: payer.id,
          splitMethod,
          ...(splitMethod === 'percentage'
            ? {
                percentageShares: Object.fromEntries(
                  group.participants.map((participant, index) => [
                    participant.id,
                    enteredShares[index],
                  ]),
                ),
              }
            : {}),
          ...(splitMethod === 'exact' ? { exactShares } : {}),
          metadata: {
            ...(category.trim() ? { category: category.trim() } : {}),
            ...(sharedItems.length > 0
              ? {
                  items: sharedItems
                    .map((item) => ({
                      name: item.name.trim(),
                      amount: Number(item.amount.replace(',', '.')),
                    }))
                    .filter((item) => item.name.length > 0 && item.amount > 0),
                }
              : {}),
          },
        },
      });
      if (!expenseResponse.ok) throw new Error('expense_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['quick-split-expenses'] }),
      ]);
      if (params.quickSplitId && params.expenseId) {
        await queryClient.invalidateQueries({
          queryKey: [
            'quick-split-expense',
            params.quickSplitId,
            params.expenseId,
          ],
        });
      }
      router.replace(
        (params.from === 'friends' ? '/expenses/friends' : '/(tabs)') as never,
      );
    },
  });

  async function submitExpense() {
    if (!isEditMode && !(await ensureUsername())) return;
    mutation.mutate(undefined, {
      onError: () =>
        Alert.alert(
          'No se pudo crear',
          'Completa los datos e intenta nuevamente.',
        ),
    });
  }

  return (
    <Screen>
      <ScreenHeader
        title={
          isEditMode ? 'Editar gasto compartido' : 'Nuevo gasto compartido'
        }
        onBack={() =>
          router.replace(
            (params.from === 'friends'
              ? '/expenses/friends'
              : '/(tabs)') as never,
          )
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {isEditMode && expenseQuery.isLoading ? (
          <Card style={styles.card}>
            <Spinner color="#DE034D" />
          </Card>
        ) : null}
        {isEditMode && expenseQuery.isError ? (
          <Card style={styles.card}>
            <Text style={styles.errorText}>No se pudo cargar el gasto.</Text>
            <Button onPress={() => void expenseQuery.refetch()}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : null}
        <Card style={styles.card}>
          <Label>Nombre del grupo (opcional)</Label>
          <Input
            editable={!isEditMode}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Cena con amigos"
          />
          <Label>Participantes</Label>
          <Input
            editable={!isEditMode}
            value={participants}
            onChangeText={setParticipants}
            placeholder="Ana, Carlos, Luisa"
          />
          <Text style={styles.hint}>Sepáralos con comas.</Text>
          <Input
            editable={!isEditMode}
            value={friendSearch}
            onChangeText={setFriendSearch}
            placeholder="Buscar usuario para agregar"
            autoCapitalize="none"
          />
          {usersQuery.data?.data?.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              disabled={user.id === currentUserId}
              onPress={() => {
                if (user.id === currentUserId) return;
                const currentNames = namesFromInput(participants);
                if (!currentNames.includes(user.name)) {
                  setParticipants([...currentNames, user.name].join(', '));
                  setParticipantData((current) => [
                    ...current,
                    { name: user.name, userId: user.id },
                  ]);
                }
                setFriendSearch('');
              }}
            >
              <Text style={styles.outlineText}>
                {user.name}
                {user.username ? ` @${user.username}` : ''}
                {user.id === currentUserId ? ' · Tú' : ''}
              </Text>
            </Button>
          ))}
          <Label>Descripción del gasto</Label>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Cena"
          />
          <Label>Monto</Label>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Label>Categoría</Label>
          <Input
            value={category}
            onChangeText={setCategory}
            placeholder="Comida, transporte..."
          />
          <Label>Moneda</Label>
          {(['COP', 'USD', 'EUR'] as const).map((option) => (
            <Button
              key={option}
              variant={currency === option ? 'default' : 'outline'}
              onPress={() => setCurrency(option)}
            >
              <Text
                style={
                  currency === option ? styles.buttonText : styles.outlineText
                }
              >
                {option}
              </Text>
            </Button>
          ))}
          <Label>Quién pagó</Label>
          {splitParticipants.map((participant, index) => (
            <Button
              key={`payer-${participant}`}
              variant={payerIndex === String(index) ? 'default' : 'outline'}
              onPress={() => setPayerIndex(String(index))}
            >
              <Text
                style={
                  payerIndex === String(index)
                    ? styles.buttonText
                    : styles.outlineText
                }
              >
                {participant}
              </Text>
            </Button>
          ))}
          <Label>Método de reparto</Label>
          {(['equal', 'percentage', 'exact'] as const).map((method) => (
            <Button
              key={method}
              variant={splitMethod === method ? 'default' : 'outline'}
              onPress={() => setSplitMethod(method)}
            >
              <Text
                style={
                  splitMethod === method
                    ? styles.buttonText
                    : styles.outlineText
                }
              >
                {method === 'equal'
                  ? 'Partes iguales'
                  : method === 'percentage'
                    ? 'Porcentaje'
                    : 'Montos exactos'}
              </Text>
            </Button>
          ))}
          {splitMethod !== 'equal'
            ? splitParticipants.map((participant, index) => (
                <Input
                  key={`share-${participant}`}
                  value={shareValues[String(index)] ?? ''}
                  onChangeText={(value) =>
                    setShareValues((current) => ({
                      ...current,
                      [String(index)]: value,
                    }))
                  }
                  keyboardType="decimal-pad"
                  placeholder={`${participant} ${splitMethod === 'percentage' ? '%' : 'monto'}`}
                />
              ))
            : null}
          {splitMethod !== 'equal' ? (
            <Card style={styles.itemsCard}>
              <Text style={styles.itemsTitle}>Ítems compartidos</Text>
              <Text style={styles.hint}>
                Detalla los conceptos incluidos en el gasto.
              </Text>
              {sharedItems.map((item, index) => (
                <Card
                  key={`${item.name}-${item.amount}`}
                  style={styles.itemRow}
                >
                  <Input
                    value={item.name}
                    onChangeText={(value) =>
                      setSharedItems((current) =>
                        current.map((entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, name: value }
                            : entry,
                        ),
                      )
                    }
                    placeholder="Descripción del ítem"
                  />
                  <Input
                    value={item.amount}
                    onChangeText={(value) =>
                      setSharedItems((current) =>
                        current.map((entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, amount: value }
                            : entry,
                        ),
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="Monto"
                  />
                  <Button
                    variant="outline"
                    onPress={() =>
                      setSharedItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Text style={styles.outlineText}>Eliminar ítem</Text>
                  </Button>
                </Card>
              ))}
              <Button
                variant="outline"
                onPress={() =>
                  setSharedItems((current) => [
                    ...current,
                    { name: '', amount: '' },
                  ])
                }
              >
                <Text style={styles.outlineText}>＋ Agregar ítem</Text>
              </Button>
            </Card>
          ) : null}
          <Button
            disabled={
              mutation.isPending ||
              (isEditMode && (expenseQuery.isLoading || !expenseQuery.data))
            }
            onPress={() => void submitExpense()}
          >
            {mutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isEditMode ? 'Guardar cambios' : 'Crear gasto'}
              </Text>
            )}
          </Button>
        </Card>
      </ScrollView>
      {usernameDialog}
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 152 },
  card: { gap: 12, margin: 16, padding: 18 },
  hint: { color: '#64748B', fontSize: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  itemsCard: { gap: 10, padding: 12, backgroundColor: '#F8FAFC' },
  itemsTitle: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  itemRow: { gap: 8, padding: 10, backgroundColor: '#FFFFFF' },
});

function namesFromInput(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseParticipantData(
  value?: string,
  fallback?: string,
): ParticipantData[] {
  if (value) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as ParticipantData).name === 'string',
        )
      ) {
        return parsed as ParticipantData[];
      }
    } catch {
      // Fall through to the text input when params are malformed.
    }
  }

  return namesFromInput(fallback ?? '').map((name) => ({ name }));
}
