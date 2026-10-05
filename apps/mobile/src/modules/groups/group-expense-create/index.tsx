import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type SplitMethod = 'equal' | 'percentage' | 'exact';
type AdvancedExpenseType =
  | 'stay'
  | 'food'
  | 'transport'
  | 'activity'
  | 'purchase'
  | 'other';

export default function GroupExpenseCreateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [paidById, setPaidById] = useState('');
  const [paidByIds, setPaidByIds] = useState<string[]>([]);
  const [payerValues, setPayerValues] = useState<Record<string, string>>({});
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [shareValues, setShareValues] = useState<Record<string, string>>({});
  const [lineItemDescriptions, setLineItemDescriptions] = useState<
    Record<string, string>
  >({});
  const [advancedType, setAdvancedType] =
    useState<AdvancedExpenseType>('other');
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
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
  const members =
    groupQuery.data && 'members' in groupQuery.data
      ? groupQuery.data.members
      : [];
  const categories =
    groupQuery.data && 'categories' in groupQuery.data
      ? groupQuery.data.categories
      : [];
  const advancedDetailsEnabled = Boolean(
    groupQuery.data &&
      'advancedExpenseDetailsEnabled' in groupQuery.data &&
      groupQuery.data.advancedExpenseDetailsEnabled,
  );
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
      const values = Object.fromEntries(
        selectedIds.map((memberId) => {
          const entered =
            Number((shareValues[memberId] ?? '').replace(',', '.')) || 0;
          return [
            memberId,
            splitMethod === 'percentage'
              ? (parsedAmount * entered) / 100
              : entered,
          ];
        }),
      );
      const expectedTotal = splitMethod === 'percentage' ? 100 : parsedAmount;
      const rawTotal = Object.values(shareValues).reduce(
        (sum, value) => sum + (Number(value.replace(',', '.')) || 0),
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
        (payerIds.length > 1 && Math.abs(payerTotal - parsedAmount) > 0.01) ||
        (splitMethod === 'exact' &&
          Object.values(values).some((value) => value <= 0)) ||
        (splitMethod !== 'equal' && Math.abs(rawTotal - expectedTotal) > 0.01)
      )
        throw new Error('invalid');
      const response = await groupsClient[':id'].expenses.$post({
        param: { id },
        json: {
          description: description.trim(),
          amount: parsedAmount,
          currency: 'COP',
          participantIds: selectedIds,
          paidById: payerIds[0],
          paidByIds: payerIds,
          ...(payerIds.length > 1 ? { payers: payerAmounts } : {}),
          splitMethod,
          ...(splitMethod !== 'equal'
            ? {
                exactShares: values,
                sharedSplit: {
                  amount: parsedAmount,
                  splitMethod,
                  splitValues: values,
                },
              }
            : {}),
          ...(splitMethod === 'exact'
            ? {
                lineItems: selectedIds.map((memberId) => ({
                  memberId,
                  description:
                    lineItemDescriptions[memberId]?.trim() ||
                    'Gasto compartido',
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
                  ...(websiteUrl.trim()
                    ? { websiteUrl: websiteUrl.trim() }
                    : {}),
                  ...(notes.trim() ? { notes: notes.trim() } : {}),
                },
              }
            : {}),
          ...(advancedDetailsEnabled && attachment
            ? { attachmentImage: attachment }
            : {}),
        },
      });
      if (!response.ok) throw new Error('failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-expenses', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
      ]);
      router.back();
    },
  });
  return (
    <Screen>
      <ScreenHeader title="Nuevo gasto" onBack={() => router.back()} />
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
          {categories.length > 0 ? (
            <>
              <Label>Categoría</Label>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 152 },
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#111827', fontSize: 14, fontWeight: '600' },
  helperText: { color: '#6B7280', fontSize: 13 },
});
