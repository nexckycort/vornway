import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { readCachedGroupExpenses } from '@/lib/group-expense-cache';

export default function GroupExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{
    id: string;
    expenseId: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const expenseQuery = useQuery({
    queryKey: ['group-expense', id, expenseId],
    enabled: Boolean(id && expenseId),
    queryFn: async () => {
      const response = await groupsClient[':id'].expenses[':expenseId'].$get({
        param: { id: id ?? '', expenseId: expenseId ?? '' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el gasto');
      return response.json();
    },
  });
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el grupo');
      return response.json();
    },
  });
  const cachedExpenseQuery = useQuery({
    queryKey: ['cached-group-expenses', id],
    enabled: Boolean(id && expenseId),
    queryFn: () => readCachedGroupExpenses(id ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await groupsClient[':id'].expenses[':expenseId'].$delete(
        { param: { id: id ?? '', expenseId: expenseId ?? '' } },
      );
      if (!response.ok) throw new Error('No se pudo eliminar');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['group-expenses', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
      router.replace(`/groups/${id}` as never);
    },
  });
  const updateMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = Number(amount.replace(',', '.'));
      if (
        !description.trim() ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      ) {
        throw new Error('invalid');
      }
      const response = await groupsClient[':id'].expenses[':expenseId'].$put({
        param: { id: id ?? '', expenseId: expenseId ?? '' },
        json: {
          description: description.trim(),
          amount: parsedAmount,
          currency,
          participantIds:
            expense?.participants?.map((participant) => participant.memberId) ??
            [],
          ...(expense?.paidBy?.id ? { paidById: expense.paidBy.id } : {}),
          ...(expense?.paidByMembers?.length
            ? {
                paidByIds: expense.paidByMembers.map(
                  (member) => member.memberId,
                ),
                payers: expense.paidByMembers.map((member) => ({
                  memberId: member.memberId,
                  amount: member.amount,
                })),
              }
            : {}),
          splitMethod:
            expense?.sharedSplit?.splitMethod ??
            expense?.splitMethod ??
            'equal',
          ...(expense?.splitMethod === 'exact' && expense?.participants
            ? {
                exactShares: Object.fromEntries(
                  expense.participants.map((participant) => [
                    participant.memberId,
                    participant.share,
                  ]),
                ),
              }
            : {}),
          ...(expense?.sharedSplit ? { sharedSplit: expense.sharedSplit } : {}),
          ...(expense?.lineItems?.length
            ? { lineItems: expense.lineItems }
            : {}),
          ...(expense?.advancedDetails
            ? { advancedDetails: expense.advancedDetails }
            : {}),
          ...(expense?.category?.id ? { categoryId: expense.category.id } : {}),
          ...(expense?.tags?.length ? { tags: expense.tags } : {}),
        },
      });
      if (!response.ok) throw new Error('update_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({
          queryKey: ['group-expense', id, expenseId],
        }),
        queryClient.invalidateQueries({ queryKey: ['group-expenses', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
      setEditOpen(false);
    },
  });
  const expense =
    expenseQuery.data && 'description' in expenseQuery.data
      ? expenseQuery.data
      : null;
  const cachedExpense = cachedExpenseQuery.data?.find(
    (item) => item.id === expenseId,
  );
  const advancedDetails =
    expense && 'advancedDetails' in expense ? expense.advancedDetails : null;
  const lineItems =
    expense && 'lineItems' in expense && Array.isArray(expense.lineItems)
      ? expense.lineItems
      : [];
  const members =
    groupQuery.data && 'members' in groupQuery.data
      ? groupQuery.data.members
      : [];
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  };
  const getMember = (memberId: string) =>
    members.find((member) => member.id === memberId);
  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?';
  return (
    <Screen>
      <ScreenHeader
        title="Detalle del gasto"
        onBack={() => router.replace(`/groups/${id}` as never)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!expense && cachedExpense ? (
          <Card style={styles.card}>
            <Text style={styles.title}>{cachedExpense.description}</Text>
            <Text style={styles.amount}>
              {cachedExpense.amount} {cachedExpense.currency}
            </Text>
            <Text style={styles.copy}>
              Este gasto está disponible sin conexión. Vuelve a conectarte para
              ver participantes y detalles completos.
            </Text>
          </Card>
        ) : !expense ? (
          <Spinner color="#DE034D" />
        ) : (
          <Card style={styles.card}>
            <Text style={styles.title}>{expense.description}</Text>
            <Text style={styles.amount}>
              {expense.amount} {expense.currency}
            </Text>
            <Text style={styles.copy}>{formatDate(expense.date)}</Text>
            {expense.category?.name ? (
              <View
                style={[
                  styles.category,
                  {
                    backgroundColor: `${expense.category.color ?? '#0F766E'}22`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: expense.category.color ?? '#0F766E' },
                  ]}
                >
                  {expense.category.icon ? `${expense.category.icon} ` : ''}
                  {expense.category.name}
                </Text>
              </View>
            ) : null}
            <Text style={styles.copy}>
              {expense.paidBy?.name
                ? `Pagado por ${expense.paidBy.name}`
                : 'Gasto compartido'}
            </Text>
            {expense.category?.name ? (
              <Text style={styles.copy}>
                Categoría: {expense.category.name}
              </Text>
            ) : null}
            {expense.tags?.length ? (
              <Text style={styles.copy}>
                Etiquetas: {expense.tags.map((tag) => `#${tag}`).join(' ')}
              </Text>
            ) : null}
            {expense.paidByMembers && expense.paidByMembers.length > 1 ? (
              <Text style={styles.copy}>
                Pagado entre{' '}
                {expense.paidByMembers.map((member) => member.name).join(', ')}
              </Text>
            ) : null}
            <Card style={styles.detailsCard}>
              <Text style={styles.subtitle}>Pagado por</Text>
              {(expense.paidByMembers?.length
                ? expense.paidByMembers
                : [
                    {
                      memberId: expense.paidBy.id,
                      name: expense.paidBy.name,
                      amount: expense.amount,
                    },
                  ]
              ).map((payer) => {
                const member = getMember(payer.memberId);
                return (
                  <View key={payer.memberId} style={styles.memberRow}>
                    <Avatar size="sm">
                      {member?.image ? (
                        <AvatarImage source={{ uri: member.image }} />
                      ) : null}
                      <AvatarFallback>{initials(payer.name)}</AvatarFallback>
                    </Avatar>
                    <Text style={styles.copy}>
                      {payer.name}
                      {member?.isCurrentUser ? ' (tú)' : ''}
                    </Text>
                    <Text style={styles.memberAmount}>
                      {payer.amount} {expense.currency}
                    </Text>
                  </View>
                );
              })}
            </Card>
            {advancedDetails ? (
              <Card style={styles.detailsCard}>
                <Text style={styles.subtitle}>Detalles avanzados</Text>
                <Text style={styles.copy}>Tipo: {advancedDetails.type}</Text>
                {advancedDetails.placeName ? (
                  <Text style={styles.copy}>
                    Lugar: {advancedDetails.placeName}
                  </Text>
                ) : null}
                {advancedDetails.address ? (
                  <Text style={styles.copy}>
                    Dirección: {advancedDetails.address}
                  </Text>
                ) : null}
                {advancedDetails.mapUrl ? (
                  <Button
                    variant="outline"
                    onPress={() =>
                      void Linking.openURL(advancedDetails.mapUrl as string)
                    }
                  >
                    <Text style={styles.outline}>Abrir ubicación</Text>
                  </Button>
                ) : null}
                {advancedDetails.contactName ? (
                  <Text style={styles.copy}>
                    Contacto: {advancedDetails.contactName}
                  </Text>
                ) : null}
                {advancedDetails.phone ? (
                  <Text style={styles.copy}>
                    Teléfono: {advancedDetails.phone}
                  </Text>
                ) : null}
                {advancedDetails.email ? (
                  <Text style={styles.copy}>
                    Correo: {advancedDetails.email}
                  </Text>
                ) : null}
                {advancedDetails.bookingCode ? (
                  <Text style={styles.copy}>
                    Reserva: {advancedDetails.bookingCode}
                  </Text>
                ) : null}
                {advancedDetails.reservationTime ? (
                  <Text style={styles.copy}>
                    Fecha: {advancedDetails.reservationTime}
                  </Text>
                ) : null}
                {advancedDetails.websiteUrl ? (
                  <Text style={styles.copy}>
                    Web: {advancedDetails.websiteUrl}
                  </Text>
                ) : null}
                {advancedDetails.notes ? (
                  <Text style={styles.copy}>
                    Notas: {advancedDetails.notes}
                  </Text>
                ) : null}
              </Card>
            ) : null}
            {expense.sharedSplit?.items?.length ? (
              <Card style={styles.detailsCard}>
                <Text style={styles.subtitle}>Gasto compartido</Text>
                <Text style={styles.copy}>
                  Total compartido: {expense.sharedSplit.amount}{' '}
                  {expense.currency}
                </Text>
                {expense.sharedSplit.items.map((item) => (
                  <Text key={`${item.name}-${item.amount}`} style={styles.copy}>
                    {item.name}: {item.amount} {expense.currency}
                  </Text>
                ))}
              </Card>
            ) : null}
            {lineItems.length > 0 ? (
              <Card style={styles.detailsCard}>
                <Text style={styles.subtitle}>Desglose</Text>
                {lineItems.map((item) => (
                  <Text
                    key={`${item.memberId}-${item.description}-${item.amount}`}
                    style={styles.copy}
                  >
                    {expense.participants?.find(
                      (participant) => participant.memberId === item.memberId,
                    )?.name ?? 'Participante'}{' '}
                    · {item.description}: {item.amount} {expense.currency}
                  </Text>
                ))}
              </Card>
            ) : null}
            {'attachmentUrl' in expense && expense.attachmentUrl ? (
              <Card style={styles.detailsCard}>
                <Text style={styles.subtitle}>Adjunto</Text>
                <Image
                  source={{ uri: expense.attachmentUrl }}
                  style={styles.attachment}
                  contentFit="contain"
                />
              </Card>
            ) : null}
            <Button
              variant="outline"
              onPress={() => {
                setDescription(expense.description);
                setAmount(String(expense.amount));
                setCurrency(expense.currency);
                setEditOpen(true);
              }}
            >
              <Text style={styles.outline}>Editar gasto</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: '/groups/[id]/add-expense',
                  params: { id, expenseId },
                } as never)
              }
            >
              <Text style={styles.outline}>Editar reparto y detalles</Text>
            </Button>
            {expense.isSettlement ? (
              <Button
                variant="outline"
                onPress={() =>
                  router.push(
                    `/groups/${id}/settle?settlementExpenseId=${expenseId}` as never,
                  )
                }
              >
                <Text style={styles.outline}>Editar liquidación</Text>
              </Button>
            ) : null}
            {!expense.isSettlement && expense.participants?.length ? (
              <Card style={styles.detailsCard}>
                <Text style={styles.subtitle}>Compartido con</Text>
                {expense.participants.map((participant) => {
                  const member = getMember(participant.memberId);
                  return (
                    <View key={participant.memberId} style={styles.memberRow}>
                      <Avatar size="sm">
                        {member?.image ? (
                          <AvatarImage source={{ uri: member.image }} />
                        ) : null}
                        <AvatarFallback>
                          {initials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Text style={styles.copy}>
                        {participant.name}
                        {member?.isCurrentUser ? ' (tú)' : ''}
                      </Text>
                      <Text style={styles.memberAmount}>
                        {participant.share} {expense.currency}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            ) : null}
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onPress={() =>
                Alert.alert(
                  expense.isSettlement
                    ? 'Eliminar liquidación'
                    : 'Eliminar gasto',
                  '¿Quieres eliminar este movimiento?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: () =>
                        deleteMutation.mutate(undefined, {
                          onError: () =>
                            Alert.alert(
                              'No se pudo eliminar',
                              'Intenta nuevamente.',
                            ),
                        }),
                    },
                  ],
                )
              }
            >
              <Text style={styles.delete}>Eliminar gasto</Text>
            </Button>
          </Card>
        )}
      </ScrollView>
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Editar gasto</DrawerTitle>
          </DrawerHeader>
          <Label>Descripción</Label>
          <Input value={description} onChangeText={setDescription} />
          <Label>Monto</Label>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
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
                    currency === option ? styles.buttonText : styles.outline
                  }
                >
                  {option}
                </Text>
              </Button>
            ),
          )}
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
              <Text style={styles.buttonText}>
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
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
  card: { gap: 12, margin: 16, padding: 20 },
  detailsCard: { gap: 8, padding: 12 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  category: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: { fontSize: 12, fontWeight: '600' },
  memberRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  memberAmount: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outline: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  attachment: { borderRadius: 12, height: 180, width: '100%' },
});
