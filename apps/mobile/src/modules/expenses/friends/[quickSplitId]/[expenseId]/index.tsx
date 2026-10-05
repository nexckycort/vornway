import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { quickSplitsClient } from '@/api/quick-splits';
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
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Expense = {
  id?: string;
  description: string;
  amount: number;
  currency: string;
  splitMethod?: 'equal' | 'percentage' | 'exact';
  metadata?: {
    category?: string;
    items?: Array<{ name: string; amount: number }>;
  } | null;
  participants?: Array<{
    id: string;
    name: string;
    balance?: number;
    share?: number;
  }>;
  settlements?: Array<{
    id: string;
    from: { id: string; name: string };
    to: { id: string; name: string };
    amount: number;
    currency: string;
    createdAt: string;
  }>;
};
export default function QuickSplitExpenseDetailScreen() {
  const { quickSplitId, expenseId, from } = useLocalSearchParams<{
    quickSplitId: string;
    expenseId: string;
    from?: 'home' | 'friends';
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [settlement, setSettlement] = useState('');
  const [fromParticipantId, setFromParticipantId] = useState('');
  const [toParticipantId, setToParticipantId] = useState('');
  const [expandedSettlementParticipants, setExpandedSettlementParticipants] =
    useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState<
    'equal' | 'percentage' | 'exact'
  >('equal');
  const [editShares, setEditShares] = useState<Record<string, string>>({});
  const [editCategory, setEditCategory] = useState('');
  const [editItems, setEditItems] = useState<
    Array<{ name: string; amount: string }>
  >([]);
  const expenseQuery = useQuery({
    queryKey: ['quick-split-expense', quickSplitId, expenseId],
    enabled: Boolean(quickSplitId && expenseId),
    queryFn: async () => {
      const response = await quickSplitsClient[':id'].expenses[
        ':expenseId'
      ].$get({
        param: { id: quickSplitId ?? '', expenseId: expenseId ?? '' },
      });
      if (!response.ok) throw new Error('expense_load_failed');
      return (await response.json()) as unknown as Expense;
    },
  });
  const expense = expenseQuery.data ?? null;
  useEffect(() => {
    if (!expense || fromParticipantId || toParticipantId) return;
    setFromParticipantId(expense.participants?.[0]?.id ?? '');
    setToParticipantId(expense.participants?.[1]?.id ?? '');
  }, [expense, fromParticipantId, toParticipantId]);
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!quickSplitId || !expenseId || !expense) throw new Error('invalid');
      const nextAmount = Number(editAmount.replace(',', '.'));
      if (
        !editDescription.trim() ||
        !Number.isFinite(nextAmount) ||
        nextAmount <= 0
      )
        throw new Error('invalid');
      const enteredShares = (expense.participants ?? []).map(
        (participant) =>
          Number((editShares[participant.id] ?? '').replace(',', '.')) || 0,
      );
      const shareTotal = enteredShares.reduce((sum, value) => sum + value, 0);
      const expectedTotal = editMethod === 'percentage' ? 100 : nextAmount;
      if (editMethod !== 'equal' && Math.abs(shareTotal - expectedTotal) > 0.01)
        throw new Error('invalid_split');
      const response = await quickSplitsClient[':id'].expenses[
        ':expenseId'
      ].$put({
        param: { id: quickSplitId, expenseId },
        json: {
          description: editDescription.trim(),
          amount: nextAmount,
          currency: expense.currency,
          paidByParticipantId: fromParticipantId,
          splitMethod: editMethod,
          ...(editMethod === 'percentage'
            ? {
                percentageShares: Object.fromEntries(
                  (expense.participants ?? []).map((participant, index) => [
                    participant.id,
                    enteredShares[index],
                  ]),
                ),
              }
            : {}),
          ...(editMethod === 'exact'
            ? {
                exactShares: Object.fromEntries(
                  (expense.participants ?? []).map((participant, index) => [
                    participant.id,
                    editMethod === 'exact'
                      ? enteredShares[index]
                      : nextAmount / (expense.participants?.length || 1),
                  ]),
                ),
              }
            : {}),
          metadata: {
            ...(editCategory.trim() ? { category: editCategory.trim() } : {}),
            ...(editItems.length > 0
              ? {
                  items: editItems
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
      if (!response.ok) throw new Error('update_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({
          queryKey: ['quick-split-expense', quickSplitId, expenseId],
        }),
        queryClient.invalidateQueries({ queryKey: ['quick-split-expenses'] }),
      ]);
      setEditOpen(false);
    },
  });
  const settlementMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!quickSplitId || !expenseId || !expense) throw new Error('invalid');
      const response = await quickSplitsClient[':id'].expenses[
        ':expenseId'
      ].settlements.$post({
        param: { id: quickSplitId, expenseId },
        json: {
          amount,
          currency: expense.currency,
          fromParticipantId,
          toParticipantId,
        },
      });
      if (!response.ok) throw new Error('settlement_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({
          queryKey: ['quick-split-expense', quickSplitId, expenseId],
        }),
        queryClient.invalidateQueries({ queryKey: ['quick-split-expenses'] }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!quickSplitId || !expenseId) throw new Error('invalid');
      const response = await quickSplitsClient[':id'].expenses[
        ':expenseId'
      ].$delete({ param: { id: quickSplitId, expenseId } });
      if (!response.ok) throw new Error('delete_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['quick-split-expenses'] }),
      ]);
      router.replace(
        from === 'home' ? ('/(tabs)' as never) : ('/expenses/friends' as never),
      );
    },
  });
  async function settle() {
    const amount = Number(settlement.replace(',', '.'));
    const participants = expense?.participants ?? [];
    if (
      !quickSplitId ||
      !expenseId ||
      participants.length < 2 ||
      !fromParticipantId ||
      !toParticipantId ||
      fromParticipantId === toParticipantId ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      return;
    try {
      await settlementMutation.mutateAsync(amount);
    } catch {
      Alert.alert('No se pudo registrar', 'Intenta nuevamente.');
      return;
    }
    setSettlement('');
    Alert.alert('Listo', 'El abono fue registrado.');
  }
  async function remove() {
    try {
      await deleteMutation.mutateAsync();
    } catch {
      Alert.alert('No se pudo eliminar', 'Intenta nuevamente.');
    }
  }
  function openEdit() {
    if (!expense) return;
    setEditDescription(expense.description);
    setEditAmount(String(expense.amount));
    setEditMethod(expense.splitMethod ?? 'equal');
    setEditCategory(expense.metadata?.category ?? '');
    setEditItems(
      (expense.metadata?.items ?? []).map((item) => ({
        name: item.name,
        amount: String(item.amount),
      })),
    );
    setEditShares(
      Object.fromEntries(
        (expense.participants ?? []).map((participant) => [
          participant.id,
          expense.splitMethod === 'percentage'
            ? String(
                ((participant.share ?? participant.balance ?? 0) /
                  expense.amount) *
                  100,
              )
            : String(participant.share ?? participant.balance ?? 0),
        ]),
      ),
    );
    setEditOpen(true);
  }
  return (
    <Screen>
      <ScreenHeader
        title="Detalle del gasto"
        onBack={() =>
          router.replace(
            from === 'home'
              ? ('/(tabs)' as never)
              : ('/expenses/friends' as never),
          )
        }
      />
      {expense ? (
        <Card style={styles.card}>
          <Text style={styles.title}>{expense.description}</Text>
          <Text style={styles.amount}>
            {expense.amount} {expense.currency}
          </Text>
          {expense.metadata?.category ? (
            <Text style={styles.copy}>
              Categoría: {expense.metadata.category}
            </Text>
          ) : null}
          {expense.metadata?.items?.length ? (
            <Card style={styles.itemsCard}>
              <Text style={styles.label}>Ítems compartidos</Text>
              {expense.metadata.items.map((item) => (
                <Text key={`${item.name}-${item.amount}`} style={styles.copy}>
                  {item.name}: {item.amount} {expense.currency}
                </Text>
              ))}
            </Card>
          ) : null}
          <Button variant="outline" onPress={openEdit}>
            <Text style={styles.outlineText}>Editar gasto</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/expenses/quick-split',
                params: { quickSplitId, expenseId, from: 'friends' },
              } as never)
            }
          >
            <Text style={styles.outlineText}>Editar reparto completo</Text>
          </Button>
          {expense.participants?.map((participant) => {
            const participantSettlements = (expense.settlements ?? []).filter(
              (item) => item.from.id === participant.id,
            );
            const isExpanded = expandedSettlementParticipants[participant.id];
            const visibleSettlements = isExpanded
              ? participantSettlements
              : participantSettlements.slice(0, 2);
            const remainingSettlements = Math.max(
              0,
              participantSettlements.length - 2,
            );
            return (
              <Card key={participant.id} style={styles.participantCard}>
                <Text style={styles.copy}>
                  {participant.name}:{' '}
                  {participant.share ?? participant.balance ?? 0}{' '}
                  {expense.currency}
                </Text>
                {visibleSettlements.map((item) => (
                  <Text key={item.id} style={styles.settlementText}>
                    {item.from.name} → {item.to.name}: {item.amount}{' '}
                    {item.currency} ·{' '}
                    {new Date(item.createdAt).toLocaleDateString('es-CO')}
                  </Text>
                ))}
                {remainingSettlements > 0 ? (
                  <Button
                    variant="ghost"
                    onPress={() =>
                      setExpandedSettlementParticipants((current) => ({
                        ...current,
                        [participant.id]: !isExpanded,
                      }))
                    }
                  >
                    <Text style={styles.settlementToggle}>
                      {isExpanded
                        ? 'Ver menos'
                        : `Ver más (${remainingSettlements})`}
                    </Text>
                  </Button>
                ) : null}
              </Card>
            );
          })}
          <Text style={styles.label}>Quién paga</Text>
          {expense.participants?.map((participant) => (
            <Button
              key={`from-${participant.id}`}
              variant={
                fromParticipantId === participant.id ? 'default' : 'outline'
              }
              onPress={() => setFromParticipantId(participant.id)}
            >
              <Text style={styles.buttonText}>{participant.name}</Text>
            </Button>
          ))}
          <Text style={styles.label}>Quién recibe</Text>
          {expense.participants?.map((participant) => (
            <Button
              key={`to-${participant.id}`}
              variant={
                toParticipantId === participant.id ? 'default' : 'outline'
              }
              onPress={() => setToParticipantId(participant.id)}
            >
              <Text style={styles.buttonText}>{participant.name}</Text>
            </Button>
          ))}
          <Input
            value={settlement}
            onChangeText={setSettlement}
            keyboardType="decimal-pad"
            placeholder="Monto del abono"
          />
          <Button
            disabled={settlementMutation.isPending}
            onPress={() => void settle()}
          >
            {settlementMutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Registrar abono</Text>
            )}
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onPress={() =>
              Alert.alert('Eliminar gasto', '¿Quieres eliminar este gasto?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () => void remove(),
                },
              ])
            }
          >
            <Text style={styles.delete}>Eliminar gasto</Text>
          </Button>
        </Card>
      ) : (
        <Spinner color="#DE034D" />
      )}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Editar gasto</DrawerTitle>
          </DrawerHeader>
          <Label>Descripción</Label>
          <Input value={editDescription} onChangeText={setEditDescription} />
          <Label>Monto</Label>
          <Input
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="decimal-pad"
          />
          <Label>Categoría</Label>
          <Input
            value={editCategory}
            onChangeText={setEditCategory}
            placeholder="Comida, transporte..."
          />
          <Label>Método de reparto</Label>
          {(['equal', 'percentage', 'exact'] as const).map((method) => (
            <Button
              key={method}
              variant={editMethod === method ? 'default' : 'outline'}
              onPress={() => setEditMethod(method)}
            >
              <Text
                style={
                  editMethod === method ? styles.buttonText : styles.outlineText
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
          {editMethod !== 'equal'
            ? (expense?.participants ?? []).map((participant) => (
                <Input
                  key={`edit-share-${participant.id}`}
                  value={editShares[participant.id] ?? ''}
                  onChangeText={(value) =>
                    setEditShares((current) => ({
                      ...current,
                      [participant.id]: value,
                    }))
                  }
                  keyboardType="decimal-pad"
                  placeholder={`${participant.name} ${editMethod === 'percentage' ? '%' : 'monto'}`}
                />
              ))
            : null}
          <Label>Ítems compartidos</Label>
          {editItems.map((item, index) => (
            <Card key={`${item.name}-${item.amount}`} style={styles.itemRow}>
              <Input
                value={item.name}
                onChangeText={(value) =>
                  setEditItems((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index ? { ...entry, name: value } : entry,
                    ),
                  )
                }
                placeholder="Descripción del ítem"
              />
              <Input
                value={item.amount}
                onChangeText={(value) =>
                  setEditItems((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index ? { ...entry, amount: value } : entry,
                    ),
                  )
                }
                keyboardType="decimal-pad"
                placeholder="Monto"
              />
              <Button
                variant="outline"
                onPress={() =>
                  setEditItems((current) =>
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
              setEditItems((current) => [...current, { name: '', amount: '' }])
            }
          >
            <Text style={styles.outlineText}>＋ Agregar ítem</Text>
          </Button>
          <DrawerFooter>
            <Button
              disabled={updateMutation.isPending}
              onPress={() =>
                updateMutation.mutate(undefined, {
                  onError: () =>
                    Alert.alert('No se pudo actualizar', 'Intenta nuevamente.'),
                })
              }
            >
              <Text style={styles.buttonText}>Guardar cambios</Text>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 20 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  label: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  participantCard: { gap: 6, padding: 10 },
  itemsCard: { gap: 6, padding: 10, backgroundColor: '#F8FAFC' },
  itemRow: { gap: 8, padding: 10, backgroundColor: '#F8FAFC' },
  settlementText: { color: '#94A3B8', fontSize: 12 },
  settlementToggle: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
});
