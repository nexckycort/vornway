import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { groupsClient } from '@/api/groups';
import { mapsClient } from '@/api/maps';
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
import { enqueueExpense } from '@/lib/offline-expense-queue';

type SplitMethod = 'equal' | 'percentage' | 'exact';
type AdvancedExpenseType =
  | 'stay'
  | 'food'
  | 'transport'
  | 'activity'
  | 'purchase'
  | 'other';
type SharedExpenseItem = { id: string; name: string; amount: string };
type ExistingExpense = {
  description: string;
  amount: number;
  currency: string;
  category?: { id: string } | null;
  tags?: string[];
  paidBy?: { id: string };
  paidByMembers?: Array<{ memberId: string; amount: number }>;
  participants?: Array<{ memberId: string; share: number }>;
  splitMethod?: SplitMethod;
  lineItems?: Array<{
    memberId: string;
    description: string;
    amount: number;
  }>;
  sharedSplit?: {
    amount: number;
    splitMethod: 'percentage' | 'exact';
    splitValues?: Record<string, number>;
    items?: Array<{ name: string; amount: number }>;
  } | null;
  advancedDetails?: {
    type: AdvancedExpenseType;
    placeName?: string;
    address?: string;
    mapUrl?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    bookingCode?: string;
    reservationTime?: string;
    websiteUrl?: string;
    notes?: string;
  } | null;
};

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍽️');
  const [newCategoryColor, setNewCategoryColor] = useState('#14B8A6');
  const [paidById, setPaidById] = useState('');
  const [paidByIds, setPaidByIds] = useState<string[]>([]);
  const [payerValues, setPayerValues] = useState<Record<string, string>>({});
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [shareValues, setShareValues] = useState<Record<string, string>>({});
  const [sharedExpenseItems, setSharedExpenseItems] = useState<
    SharedExpenseItem[]
  >([]);
  const [lineItemDescriptions, setLineItemDescriptions] = useState<
    Record<string, string>
  >({});
  const [advancedType, setAdvancedType] =
    useState<AdvancedExpenseType>('other');
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bookingCode, setBookingCode] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<{
    dataUrl: string;
    fileName?: string;
  } | null>(null);
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el espacio');
      return response.json();
    },
  });
  const expenseQuery = useQuery({
    queryKey: ['group-expense', id, expenseId],
    enabled: Boolean(id && expenseId),
    queryFn: async () => {
      const response = await groupsClient[':id'].expenses[':expenseId'].$get({
        param: { id: id ?? '', expenseId: expenseId ?? '' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el gasto');
      return (await response.json()) as unknown as ExistingExpense;
    },
  });
  const members =
    groupQuery.data && 'members' in groupQuery.data
      ? groupQuery.data.members
      : [];
  const categories =
    groupQuery.data && 'categories' in groupQuery.data
      ? groupQuery.data.categories
      : [];
  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const name = newCategoryName.trim();
      if (!id || !name) throw new Error('category_name_required');
      const response = await groupsClient[':id'].categories.$post({
        param: { id },
        json: {
          name,
          icon: newCategoryIcon,
          color: newCategoryColor,
        },
      });
      if (!response.ok) throw new Error('category_create_failed');
      return response.json();
    },
    onSuccess: async (created) => {
      if (!('id' in created)) return;
      setCategoryId(created.id);
      setNewCategoryName('');
      setCreateCategoryOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['group-summary', id] });
    },
  });
  const advancedDetailsEnabled = Boolean(
    groupQuery.data &&
      'advancedExpenseDetailsEnabled' in groupQuery.data &&
      groupQuery.data.advancedExpenseDetailsEnabled,
  );
  useEffect(() => {
    const expense = expenseQuery.data;
    if (!isEditMode || !expense || editHydrated) return;
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setCurrency(expense.currency);
    setCategoryId(expense.category?.id ?? '');
    setTags((expense.tags ?? []).join(' '));
    const participantIds = (expense.participants ?? []).map(
      (participant) => participant.memberId,
    );
    setSelectedIds(participantIds);
    const payerMembers = expense.paidByMembers ?? [];
    const payerIds = payerMembers.length
      ? payerMembers.map((payer) => payer.memberId)
      : expense.paidBy?.id
        ? [expense.paidBy.id]
        : [];
    setPaidByIds(payerIds);
    setPaidById(payerIds[0] ?? '');
    setPayerValues(
      Object.fromEntries(
        payerMembers.map((payer) => [payer.memberId, String(payer.amount)]),
      ),
    );
    const method =
      expense.sharedSplit?.splitMethod ?? expense.splitMethod ?? 'equal';
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
                  (expense.participants?.find(
                    (item) => item.memberId === memberId,
                  )?.share ?? 0) - sharedShareFallback)
                : '',
          ),
        ]),
      ),
    );
    setLineItemDescriptions(
      Object.fromEntries(
        (expense.lineItems ?? []).map((item) => [
          item.memberId,
          item.description,
        ]),
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
      setAdvancedType(expense.advancedDetails.type);
      setPlaceName(expense.advancedDetails.placeName ?? '');
      setAddress(expense.advancedDetails.address ?? '');
      setMapUrl(expense.advancedDetails.mapUrl ?? '');
      setContactName(expense.advancedDetails.contactName ?? '');
      setPhone(expense.advancedDetails.phone ?? '');
      setEmail(expense.advancedDetails.email ?? '');
      setBookingCode(expense.advancedDetails.bookingCode ?? '');
      setReservationTime(expense.advancedDetails.reservationTime ?? '');
      setWebsiteUrl(expense.advancedDetails.websiteUrl ?? '');
      setNotes(expense.advancedDetails.notes ?? '');
    }
    setEditHydrated(true);
  }, [editHydrated, expenseQuery.data, isEditMode]);
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
  useEffect(() => {
    if (selectedIds.length === 0 && members.length > 0)
      setSelectedIds(members.map((member) => member.id));
    if (!paidById && members[0]) {
      setPaidById(members[0].id);
      setPaidByIds([members[0].id]);
    }
  }, [members, paidById, selectedIds.length]);
  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = Number(amount.replace(',', '.'));
      const sharedItems = sharedExpenseItems
        .map((item) => ({
          name: item.name.trim(),
          amount: Number(item.amount.replace(',', '.')) || 0,
        }))
        .filter((item) => item.name && item.amount > 0);
      const hasInvalidSharedItem = sharedExpenseItems.some((item) => {
        const itemAmount = Number(item.amount.replace(',', '.'));
        return (
          !item.name.trim() || !Number.isFinite(itemAmount) || itemAmount <= 0
        );
      });
      const normalizedSharedAmount = sharedItems.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const selectedCount = selectedIds.length;
      const baseAmount = Math.max(parsedAmount - normalizedSharedAmount, 0);
      const sharedShare =
        selectedCount > 0 ? normalizedSharedAmount / selectedCount : 0;
      const rawValues = Object.fromEntries(
        selectedIds.map((memberId) => {
          return [
            memberId,
            Number((shareValues[memberId] ?? '').replace(',', '.')) || 0,
          ];
        }),
      );
      const values = Object.fromEntries(
        selectedIds.map((memberId) => {
          const entered = rawValues[memberId] ?? 0;
          return [
            memberId,
            splitMethod === 'percentage'
              ? baseAmount * (entered / 100) + sharedShare
              : entered + sharedShare,
          ];
        }),
      );
      const expectedTotal = splitMethod === 'percentage' ? 100 : parsedAmount;
      const rawTotal = Object.values(rawValues).reduce(
        (sum, value) => sum + value,
        0,
      );
      const payerIds =
        paidByIds.length > 0 ? paidByIds : paidById ? [paidById] : [];
      const payerAmounts = payerIds.map((memberId) => ({
        memberId,
        amount:
          payerIds.length === 1
            ? parsedAmount
            : Number((payerValues[memberId] ?? '').replace(',', '.')) || 0,
      }));
      const payerTotal = payerAmounts.reduce(
        (sum, payer) => sum + payer.amount,
        0,
      );
      if (
        !id ||
        !description.trim() ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        selectedIds.length === 0 ||
        payerIds.length === 0 ||
        hasInvalidSharedItem ||
        normalizedSharedAmount > parsedAmount ||
        (payerIds.length > 1 && Math.abs(payerTotal - parsedAmount) > 0.01) ||
        (splitMethod === 'exact' &&
          Object.values(values).some((value) => value <= 0)) ||
        (splitMethod === 'percentage' &&
          (Math.abs(rawTotal - expectedTotal) > 0.01 ||
            Object.values(rawValues).some((value) => value <= 0))) ||
        (splitMethod === 'exact' &&
          Math.abs(rawTotal + normalizedSharedAmount - parsedAmount) > 0.01)
      )
        throw new Error('invalid');
      let resolvedMapEmbedUrl: string | undefined;
      if (advancedDetailsEnabled && mapUrl.trim()) {
        try {
          const mapResponse = await mapsClient.resolve.$post({
            json: { url: mapUrl.trim() },
          });
          if (mapResponse.ok) {
            const mapPayload = (await mapResponse.json()) as {
              embedUrl?: string | null;
            };
            resolvedMapEmbedUrl = mapPayload.embedUrl ?? undefined;
          }
        } catch {
          // Keep the original URL when resolving an embed is unavailable.
        }
      }
      const payloadSplitMethod =
        normalizedSharedAmount > 0 && splitMethod !== 'equal'
          ? 'exact'
          : splitMethod;
      const payload = {
        description: description.trim(),
        amount: parsedAmount,
        currency,
        participantIds:
          groupQuery.data &&
          'type' in groupQuery.data &&
          groupQuery.data.type === 'personal'
            ? []
            : selectedIds,
        paidById: payerIds[0],
        paidByIds: payerIds,
        ...(payerIds.length > 1 ? { payers: payerAmounts } : {}),
        splitMethod: payloadSplitMethod,
        ...(splitMethod !== 'equal'
          ? {
              exactShares: values,
              ...(normalizedSharedAmount > 0
                ? {
                    sharedSplit: {
                      amount: normalizedSharedAmount,
                      splitMethod,
                      splitValues: rawValues,
                      items: sharedItems,
                    },
                  }
                : {}),
            }
          : {}),
        ...(splitMethod === 'exact'
          ? {
              lineItems: selectedIds.map((memberId) => ({
                memberId,
                description:
                  lineItemDescriptions[memberId]?.trim() || 'Gasto compartido',
                amount: values[memberId] ?? 0,
              })),
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(advancedDetailsEnabled
          ? {
              advancedDetails: {
                type: advancedType,
                ...(placeName.trim() ? { placeName: placeName.trim() } : {}),
                ...(address.trim() ? { address: address.trim() } : {}),
                ...(mapUrl.trim() ? { mapUrl: mapUrl.trim() } : {}),
                ...(resolvedMapEmbedUrl
                  ? { mapEmbedUrl: resolvedMapEmbedUrl }
                  : {}),
                ...(contactName.trim()
                  ? { contactName: contactName.trim() }
                  : {}),
                ...(phone.trim() ? { phone: phone.trim() } : {}),
                ...(email.trim() ? { email: email.trim() } : {}),
                ...(bookingCode.trim()
                  ? { bookingCode: bookingCode.trim() }
                  : {}),
                ...(reservationTime.trim()
                  ? { reservationTime: reservationTime.trim() }
                  : {}),
                ...(websiteUrl.trim() ? { websiteUrl: websiteUrl.trim() } : {}),
                ...(notes.trim() ? { notes: notes.trim() } : {}),
              },
            }
          : {}),
        ...(advancedDetailsEnabled && attachment
          ? { attachmentImage: attachment }
          : {}),
        ...(groupQuery.data &&
        'type' in groupQuery.data &&
        groupQuery.data.type === 'personal'
          ? {
              tags: tags
                .split(/[\s,]+/)
                .map((tag) => tag.replace(/^#/, '').trim())
                .filter(Boolean)
                .slice(0, 10),
            }
          : {}),
      };
      if (!isEditMode) {
        const network = await Network.getNetworkStateAsync();
        if (!network.isConnected || network.isInternetReachable === false) {
          await enqueueExpense(id, payload as Record<string, unknown>);
          return { queued: true };
        }
      }
      const response =
        isEditMode && expenseId
          ? await groupsClient[':id'].expenses[':expenseId'].$put({
              param: { id, expenseId },
              json: payload,
            })
          : await groupsClient[':id'].expenses.$post({
              param: { id },
              json: payload,
            });
      if (!response.ok) throw new Error('failed');
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
        queryClient.invalidateQueries({ queryKey: ['group-expenses', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
        ...(expenseId
          ? [
              queryClient.invalidateQueries({
                queryKey: ['group-expense', id, expenseId],
              }),
            ]
          : []),
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
          {groupQuery.data &&
          'type' in groupQuery.data &&
          groupQuery.data.type === 'personal' ? (
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
                  setSelectedIds((current) =>
                    selected
                      ? current.filter((value) => value !== member.id)
                      : [...current, member.id],
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
                setPaidByIds((current) => {
                  const next = current.includes(member.id)
                    ? current.filter((value) => value !== member.id)
                    : [...current, member.id];
                  setPaidById(next[0] ?? '');
                  return next;
                });
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
            <>
              <Label>Detalles avanzados</Label>
              <Text style={styles.helperText}>
                Agrega información útil para recordar este gasto.
              </Text>
              {(
                [
                  ['other', 'Otro'],
                  ['food', 'Comida'],
                  ['stay', 'Alojamiento'],
                  ['transport', 'Transporte'],
                  ['activity', 'Actividad'],
                  ['purchase', 'Compra'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  variant={advancedType === value ? 'default' : 'outline'}
                  onPress={() => setAdvancedType(value)}
                >
                  <Text style={styles.buttonText}>{label}</Text>
                </Button>
              ))}
              <Input
                value={placeName}
                onChangeText={setPlaceName}
                placeholder="Lugar o nombre"
              />
              <Input
                value={address}
                onChangeText={setAddress}
                placeholder="Dirección"
              />
              <Input
                value={mapUrl}
                onChangeText={setMapUrl}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="Enlace de mapa"
              />
              <Input
                value={contactName}
                onChangeText={setContactName}
                placeholder="Persona de contacto"
              />
              <Input
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Teléfono"
              />
              <Input
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Correo electrónico"
              />
              <Input
                value={bookingCode}
                onChangeText={setBookingCode}
                placeholder="Código de reserva"
              />
              <Input
                value={reservationTime}
                onChangeText={setReservationTime}
                placeholder="Fecha u hora de reserva"
              />
              <Input
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="Sitio web"
              />
              <Input
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Notas"
              />
              <Button variant="outline" onPress={() => void chooseAttachment()}>
                <Text style={styles.outlineText}>
                  {attachment ? 'Cambiar imagen adjunta' : 'Adjuntar imagen'}
                </Text>
              </Button>
            </>
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
      <Drawer open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Crear categoría</DrawerTitle>
          </DrawerHeader>
          <Label>Nombre</Label>
          <Input
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="Comida, transporte..."
          />
          <Label>Ícono</Label>
          <View style={styles.optionRow}>
            {['🍽️', '🚗', '🏨', '🎟️', '🛍️', '💸'].map((icon) => (
              <Button
                key={icon}
                size="sm"
                variant={newCategoryIcon === icon ? 'default' : 'outline'}
                onPress={() => setNewCategoryIcon(icon)}
              >
                <Text
                  style={
                    newCategoryIcon === icon
                      ? styles.buttonText
                      : styles.outlineText
                  }
                >
                  {icon}
                </Text>
              </Button>
            ))}
          </View>
          <Label>Color</Label>
          <View style={styles.optionRow}>
            {['#14B8A6', '#F43F5E', '#F59E0B', '#3B82F6', '#8B5CF6'].map(
              (color) => (
                <Button
                  key={color}
                  size="sm"
                  variant={newCategoryColor === color ? 'default' : 'outline'}
                  onPress={() => setNewCategoryColor(color)}
                >
                  <Text
                    style={{
                      color: newCategoryColor === color ? '#FFFFFF' : color,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    ●
                  </Text>
                </Button>
              ),
            )}
          </View>
          <DrawerFooter>
            <Button
              disabled={
                createCategoryMutation.isPending || !newCategoryName.trim()
              }
              onPress={() =>
                createCategoryMutation.mutate(undefined, {
                  onError: () =>
                    Alert.alert(
                      'No se pudo crear la categoría',
                      'Intenta nuevamente.',
                    ),
                })
              }
            >
              <Text style={styles.buttonText}>
                {createCategoryMutation.isPending ? 'Creando...' : 'Crear'}
              </Text>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 152 },
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outlineText: { color: '#111827', fontSize: 14, fontWeight: '600' },
  helperText: { color: '#6B7280', fontSize: 13 },
  itemCard: { gap: 8, padding: 12 },
  deleteText: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  errorCard: { gap: 10, margin: 16, padding: 16 },
  errorText: { color: '#B91C1C', fontSize: 14 },
});
