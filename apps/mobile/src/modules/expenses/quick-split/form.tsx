import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useUsernameRequirement } from '../../username/use-username-requirement';
import {
  type Currency,
  createQuickSplitExpense,
  type ParticipantData,
  type SharedItem,
  type SplitMethod,
  toCurrency,
  toSplitMethod,
  updateQuickSplitExpense,
} from './submit';

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
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const expenseQuery = useQuery({
    ...api.quickSplits.expenseDetail.queryOptions({
      params: {
        id: params.quickSplitId ?? '',
        expenseId: params.expenseId ?? '',
      },
    }),
    enabled: isEditMode,
  });
  const usersQuery = useQuery({
    ...api.users.search.queryOptions({
      query: { query: debouncedFriendSearch },
    }),
    enabled: debouncedFriendSearch.length > 1,
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
  const editExpense = expenseQuery.data;
  if (isEditMode && editExpense && !editHydrated) {
    const expense = editExpense;

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

    setGroupName(expense.quickSplitName);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setCurrency(toCurrency(expense.currency));
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
            (participant) => participant.id === expense.paidBy.id,
          ),
        ),
      ),
    );
    const method = toSplitMethod(expense.splitMethod);
    setSplitMethod(method);
    setShareValues(
      Object.fromEntries(
        orderedParticipants.map((participant, index) => [
          String(index),
          method === 'percentage'
            ? String((participant.share / expense.amount) * 100)
            : method === 'exact'
              ? String(participant.share)
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
  }
  const mutation = useMutation({
    mutationFn: async () => {
      const draft = {
        description,
        amount: Number(amount.replace(',', '.')),
        splitMethod,
        shareValues,
        category,
        sharedItems,
        payerIndex,
      };
      const expense = expenseQuery.data;
      if (isEditMode) {
        if (!expense) throw new Error('invalid');
        return updateQuickSplitExpense({
          ...draft,
          expense,
          participantIds: editParticipantIds,
        });
      }
      if (friendNames.length === 0) throw new Error('invalid');
      return createQuickSplitExpense({
        ...draft,
        name: groupName.trim() || description.trim(),
        currency,
        friends: friendNames.map((name) => {
          const registered = participantData.find(
            (participant) => participant.name === name,
          );
          return {
            name,
            ...(registered?.userId ? { userId: registered.userId } : {}),
          };
        }),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: api.quickSplits.key() }),
      ]);
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
          {usersQuery.data?.data.map((user) => (
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
