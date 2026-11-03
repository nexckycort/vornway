import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { enqueueExpense } from '@/lib/offline-expense-queue';
import { AdvancedDetailsFields } from './advanced-details-fields';
import { CreateCategoryDrawer } from './create-category-drawer';
import {
  buildExpensePayload,
  emptyAdvancedDetails,
  type ExpenseAttachment,
  type SharedExpenseItem,
  type SplitMethod,
} from './expense-payload';

const resolveMapEmbedUrl = (url: string) =>
  api.maps.resolve
    .request({ payload: { url } })
    .then((map) => map.embedUrl ?? undefined)
    .catch(() => undefined);

export default function GroupExpenseCreateScreen() {
  const { id, expenseId } = useLocalSearchParams<{
    id: string;
    expenseId?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(expenseId);
  const [editHydrated, setEditHydrated] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [tags, setTags] = useState('');
  const [pickedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [pickedPayerIds, setPaidByIds] = useState<string[]>([]);
  const [payerValues, setPayerValues] = useState<Record<string, string>>({});
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [shareValues, setShareValues] = useState<Record<string, string>>({});
  const [sharedExpenseItems, setSharedExpenseItems] = useState<
    SharedExpenseItem[]
  >([]);
  const [lineItemDescriptions, setLineItemDescriptions] = useState<
    Record<string, string>
  >({});
  const [advanced, setAdvanced] = useState(emptyAdvancedDetails);
  const [attachment, setAttachment] = useState<ExpenseAttachment | null>(null);
  const groupQuery = useQuery({
    ...api.groups.get.queryOptions({ params: { id: id ?? '' } }),
    enabled: Boolean(id),
  });
  const expenseQuery = useQuery({
    ...api.groups.getExpense.queryOptions({
      params: { id: id ?? '', expenseId: expenseId ?? '' },
    }),
    enabled: Boolean(id && expenseId),
  });
  const members = groupQuery.data?.members ?? [];
  const categories = groupQuery.data?.categories ?? [];
  const isPersonal = groupQuery.data?.type === 'personal';
  const advancedDetailsEnabled =
    groupQuery.data?.advancedExpenseDetailsEnabled ?? false;
  const selectedIds =
    pickedIds.length > 0 ? pickedIds : members.map((member) => member.id);
  const paidByIds =
    pickedPayerIds.length > 0
      ? pickedPayerIds
      : members[0]
        ? [members[0].id]
        : [];
  const existingExpense = expenseQuery.data;
  if (isEditMode && existingExpense && !editHydrated) {
    const expense = existingExpense;
    setEditHydrated(true);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setCurrency(expense.currency);
    setCategoryId(expense.category?.id ?? '');
    setTags(expense.tags.join(' '));
    const participantIds = expense.participants.map(
      (participant) => participant.memberId,
    );
    setSelectedIds(participantIds);
    const payerMembers = expense.paidByMembers;
    const payerIds = payerMembers.length
      ? payerMembers.map((payer) => payer.memberId)
      : expense.paidBy?.id
        ? [expense.paidBy.id]
        : [];
    setPaidByIds(payerIds);
    setPayerValues(
      Object.fromEntries(
        payerMembers.map((payer) => [payer.memberId, String(payer.amount)]),
      ),
    );
    const method =
      expense.sharedSplit?.splitMethod ??
      (expense.splitMethod === 'unknown' ? 'equal' : expense.splitMethod);
    setSplitMethod(method);
    const splitValues = expense.sharedSplit?.splitValues ?? {};
    const sharedShareFallback =
      expense.sharedSplit?.amount && participantIds.length > 0
        ? expense.sharedSplit.amount / participantIds.length
        : 0;
    setShareValues(
      Object.fromEntries(
        participantIds.map((memberId) => [
          memberId,
          String(
            method === 'percentage'
              ? (splitValues[memberId] ?? 0)
              : method === 'exact'
                ? (splitValues[memberId] ??
                  (expense.participants.find(
                    (item) => item.memberId === memberId,
                  )?.share ?? 0) - sharedShareFallback)
                : '',
          ),
        ]),
      ),
    );
    setLineItemDescriptions(
      Object.fromEntries(
        expense.lineItems.map((item) => [item.memberId, item.description]),
      ),
    );
    setSharedExpenseItems(
      (expense.sharedSplit?.items ?? []).map((item, index) => ({
        id: `existing-${index}`,
        name: item.name,
        amount: String(item.amount),
      })),
    );
    if (expense.advancedDetails) {
      const details = expense.advancedDetails;
      setAdvanced({
        type: details.type === 'unknown' ? 'other' : details.type,
        placeName: details.placeName ?? '',
        address: details.address ?? '',
        mapUrl: details.mapUrl ?? '',
        contactName: details.contactName ?? '',
        phone: details.phone ?? '',
        email: details.email ?? '',
        bookingCode: details.bookingCode ?? '',
        reservationTime: details.reservationTime ?? '',
        websiteUrl: details.websiteUrl ?? '',
        notes: details.notes ?? '',
      });
    }
  }
  const chooseAttachment = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) return;
    setAttachment({
      dataUrl: `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`,
      ...(asset.fileName ? { fileName: asset.fileName } : {}),
    });
  };
  const mutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('invalid');
      const payload = await buildExpensePayload(
        {
          description,
          amount,
          currency,
          tags,
          selectedIds,
          categoryId,
          paidByIds,
          payerValues,
          splitMethod,
          shareValues,
          sharedExpenseItems,
          lineItemDescriptions,
          advanced,
          attachment,
          advancedDetailsEnabled,
          isPersonal,
        },
        resolveMapEmbedUrl,
      );
      if (isEditMode && expenseId) {
        await api.groups.updateExpense.request({
          params: { id, expenseId },
          payload,
        });
        return { queued: false };
      }
      const network = await Network.getNetworkStateAsync();
      if (!network.isConnected || network.isInternetReachable === false) {
        await enqueueExpense(id, payload);
        return { queued: true };
      }
      await api.groups.createExpense.request({ params: { id }, payload });
      return { queued: false };
    },
    onSuccess: async (result) => {
      if (result.queued) {
        Alert.alert(
          'Gasto guardado sin conexión',
          'Se sincronizará automáticamente cuando vuelva la conexión.',
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: api.groups.key() }),
      ]);
      router.replace(`/groups/${id}` as never);
    },
  });
  return (
    <Screen>
      <ScreenHeader
        title={isEditMode ? 'Editar gasto' : 'Nuevo gasto'}
        onBack={() => router.replace(`/groups/${id}` as never)}
      />
      {isEditMode && expenseQuery.isError ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>No se pudo cargar el gasto.</Text>
          <Button onPress={() => void expenseQuery.refetch()}>
            <Text style={styles.outlineText}>Reintentar</Text>
          </Button>
        </Card>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Label>Descripción</Label>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Cena, transporte..."
          />
          <Label>Monto</Label>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Label>Moneda</Label>
          {(['COP', 'EUR', 'USD', 'GBP', 'MXN', 'BRL'] as const).map(
            (option) => (
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
            ),
          )}
          {isPersonal ? (
            <>
              <Label>Etiquetas</Label>
              <Input
                value={tags}
                onChangeText={setTags}
                placeholder="#viaje #comida"
              />
            </>
          ) : null}
          <Label>Participantes</Label>
          {members.map((member) => {
            const selected = selectedIds.includes(member.id);
            return (
              <Button
                key={member.id}
                variant={selected ? 'default' : 'outline'}
                onPress={() =>
                  setSelectedIds(
                    selected
                      ? selectedIds.filter((value) => value !== member.id)
                      : [...selectedIds, member.id],
                  )
                }
              >
                <Text style={styles.buttonText}>
                  {selected ? '✓ ' : ''}
                  {member.name}
                </Text>
              </Button>
            );
          })}
          <Label>Quién pagó</Label>
          {members.map((member) => (
            <Button
              key={`payer-${member.id}`}
              variant={paidByIds.includes(member.id) ? 'default' : 'outline'}
              onPress={() => {
                setPaidByIds(
                  paidByIds.includes(member.id)
                    ? paidByIds.filter((value) => value !== member.id)
                    : [...paidByIds, member.id],
                );
              }}
            >
              <Text style={styles.buttonText}>{member.name}</Text>
            </Button>
          ))}
          {paidByIds.length > 1
            ? paidByIds.map((memberId) => {
                const payer = members.find((member) => member.id === memberId);
                return payer ? (
                  <Input
                    key={`payer-amount-${memberId}`}
                    value={payerValues[memberId] ?? ''}
                    onChangeText={(value) =>
                      setPayerValues((current) => ({
                        ...current,
                        [memberId]: value,
                      }))
                    }
                    keyboardType="decimal-pad"
                    placeholder={`${payer.name} - parte pagada`}
                  />
                ) : null;
              })
            : null}
          <Label>Método de reparto</Label>
          {(['equal', 'percentage', 'exact'] as const).map((method) => (
            <Button
              key={method}
              variant={splitMethod === method ? 'default' : 'outline'}
              onPress={() => setSplitMethod(method)}
            >
              <Text style={styles.buttonText}>
                {method === 'equal'
                  ? 'Partes iguales'
                  : method === 'percentage'
                    ? 'Porcentaje'
                    : 'Montos exactos'}
              </Text>
            </Button>
          ))}
          {splitMethod !== 'equal'
            ? members
                .filter((member) => selectedIds.includes(member.id))
                .map((member) => (
                  <Input
                    key={`share-${member.id}`}
                    value={shareValues[member.id] ?? ''}
                    onChangeText={(value) =>
                      setShareValues((current) => ({
                        ...current,
                        [member.id]: value,
                      }))
                    }
                    keyboardType="decimal-pad"
                    placeholder={`${member.name} ${splitMethod === 'percentage' ? '%' : 'monto'}`}
                  />
                ))
            : null}
          {splitMethod !== 'equal' ? (
            <>
              <Label>Ítems compartidos opcionales</Label>
              {sharedExpenseItems.map((item) => (
                <Card key={item.id} style={styles.itemCard}>
                  <Input
                    value={item.name}
                    onChangeText={(value) =>
                      setSharedExpenseItems((current) =>
                        current.map((entry) =>
                          entry.id === item.id
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
                      setSharedExpenseItems((current) =>
                        current.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, amount: value }
                            : entry,
                        ),
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="Monto"
                  />
                  <Button
                    variant="ghost"
                    onPress={() =>
                      setSharedExpenseItems((current) =>
                        current.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    <Text style={styles.deleteText}>Quitar ítem</Text>
                  </Button>
                </Card>
              ))}
              <Button
                variant="outline"
                onPress={() =>
                  setSharedExpenseItems((current) => [
                    ...current,
                    {
                      id: `${Date.now()}-${current.length}`,
                      name: '',
                      amount: '',
                    },
                  ])
                }
              >
                <Text style={styles.outlineText}>Agregar ítem</Text>
              </Button>
            </>
          ) : null}
          {splitMethod === 'exact'
            ? members
                .filter((member) => selectedIds.includes(member.id))
                .map((member) => (
                  <Input
                    key={`line-item-${member.id}`}
                    value={lineItemDescriptions[member.id] ?? ''}
                    onChangeText={(value) =>
                      setLineItemDescriptions((current) => ({
                        ...current,
                        [member.id]: value,
                      }))
                    }
                    placeholder={`Detalle para ${member.name}`}
                  />
                ))
            : null}
          <Label>Categoría</Label>
          <Button variant="outline" onPress={() => setCreateCategoryOpen(true)}>
            <Text style={styles.outlineText}>＋ Crear categoría</Text>
          </Button>
          {categories.length > 0 ? (
            <>
              <Button
                variant={!categoryId ? 'default' : 'outline'}
                onPress={() => setCategoryId('')}
              >
                <Text style={styles.buttonText}>Sin categoría</Text>
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={categoryId === category.id ? 'default' : 'outline'}
                  onPress={() => setCategoryId(category.id)}
                >
                  <Text style={styles.buttonText}>{category.name}</Text>
                </Button>
              ))}
            </>
          ) : null}
          {advancedDetailsEnabled ? (
            <AdvancedDetailsFields
              value={advanced}
              onChange={setAdvanced}
              hasAttachment={Boolean(attachment)}
              onChooseAttachment={() => void chooseAttachment()}
            />
          ) : null}
          <Button
            disabled={mutation.isPending}
            onPress={() =>
              mutation.mutate(undefined, {
                onError: () =>
                  Alert.alert(
                    'No se pudo guardar',
                    'Completa los datos e intenta nuevamente.',
                  ),
              })
            }
          >
            {mutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar gasto</Text>
            )}
          </Button>
        </Card>
      </ScrollView>
      <CreateCategoryDrawer
        groupId={id}
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onCreated={setCategoryId}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 152 },
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#111827', fontSize: 14, fontWeight: '600' },
  itemCard: { gap: 8, padding: 12 },
  deleteText: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  errorCard: { gap: 10, margin: 16, padding: 16 },
  errorText: { color: '#B91C1C', fontSize: 14 },
});
