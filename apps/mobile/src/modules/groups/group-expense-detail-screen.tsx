import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
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
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await groupsClient[':id'].expenses[':expenseId'].$delete(
        { param: { id: id ?? '', expenseId: expenseId ?? '' } },
      );
      if (!response.ok) throw new Error('No se pudo eliminar');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-expenses', id] });
      await queryClient.invalidateQueries({ queryKey: ['group-summary', id] });
      router.back();
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
          currency: expense?.currency ?? 'COP',
          participantIds:
            expense?.participants?.map((participant) => participant.memberId) ??
            [],
          splitMethod: 'equal',
          ...(expense?.category?.id ? { categoryId: expense.category.id } : {}),
        },
      });
      if (!response.ok) throw new Error('update_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['group-expense', id, expenseId],
      });
      await queryClient.invalidateQueries({ queryKey: ['group-expenses', id] });
      await queryClient.invalidateQueries({ queryKey: ['group-summary', id] });
      setEditOpen(false);
    },
  });
  const expense =
    expenseQuery.data && 'description' in expenseQuery.data
      ? expenseQuery.data
      : null;
  const advancedDetails =
    expense && 'advancedDetails' in expense ? expense.advancedDetails : null;
  const lineItems =
    expense && 'lineItems' in expense && Array.isArray(expense.lineItems)
      ? expense.lineItems
      : [];
  return (
    <Screen>
      <ScreenHeader title="Detalle del gasto" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {!expense ? (
          <Spinner color="#DE034D" />
        ) : (
          <Card style={styles.card}>
            <Text style={styles.title}>{expense.description}</Text>
            <Text style={styles.amount}>
              {expense.amount} {expense.currency}
            </Text>
            <Text style={styles.copy}>
              {expense.paidBy?.name
                ? `Pagado por ${expense.paidBy.name}`
                : 'Gasto compartido'}
            </Text>
            {expense.paidByMembers && expense.paidByMembers.length > 1 ? (
              <Text style={styles.copy}>
                Pagado entre{' '}
                {expense.paidByMembers.map((member) => member.name).join(', ')}
              </Text>
            ) : null}
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
            {lineItems.length > 0 ? (
              <Card style={styles.detailsCard}>
                <Text style={styles.subtitle}>Desglose</Text>
                {lineItems.map((item) => (
                  <Text
                    key={`${item.memberId}-${item.description}-${item.amount}`}
                    style={styles.copy}
                  >
                    {item.description}: {item.amount}
                  </Text>
                ))}
              </Card>
            ) : null}
            <Button
              variant="outline"
              onPress={() => {
                setDescription(expense.description);
                setAmount(String(expense.amount));
                setEditOpen(true);
              }}
            >
              <Text style={styles.outline}>Editar gasto</Text>
            </Button>
            {expense.participants?.map((participant) => (
              <Text key={participant.memberId} style={styles.copy}>
                {participant.name}: {participant.share}
              </Text>
            ))}
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onPress={() =>
                deleteMutation.mutate(undefined, {
                  onError: () =>
                    Alert.alert('No se pudo eliminar', 'Intenta nuevamente.'),
                })
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
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outline: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
