import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { quickSplitsClient } from '@/api/quick-splits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type SplitMethod = 'equal' | 'percentage' | 'exact';

export default function ExpenseCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [shareValues, setShareValues] = useState<Record<string, string>>({});
  const [payerIndex, setPayerIndex] = useState('0');
  const mutation = useMutation({
    mutationFn: async () => {
      const names = participants
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const parsedAmount = Number(amount.replace(',', '.'));
      if (
        !groupName.trim() ||
        names.length === 0 ||
        !description.trim() ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      )
        throw new Error('invalid');
      const groupResponse = await quickSplitsClient.index.$post({
        json: {
          name: groupName.trim(),
          participants: names.map((name) => ({ name })),
        },
      });
      if (!groupResponse.ok) throw new Error('group_failed');
      const group = await groupResponse.json();
      const firstParticipant = group.participants[0];
      if (!firstParticipant) throw new Error('participant_failed');
      const enteredShares = names.map(
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
          currency: 'COP',
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
        },
      });
      if (!expenseResponse.ok) throw new Error('expense_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['quick-split-expenses'],
      });
      router.back();
    },
  });
  return (
    <Screen>
      <ScreenHeader
        title="Nuevo gasto compartido"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Label>Nombre del grupo</Label>
          <Input
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Cena con amigos"
          />
          <Label>Participantes</Label>
          <Input
            value={participants}
            onChangeText={setParticipants}
            placeholder="Ana, Carlos, Luisa"
          />
          <Text style={styles.hint}>Sepáralos con comas.</Text>
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
          <Label>Quién pagó</Label>
          {namesFromInput(participants).map((participant, index) => (
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
            ? namesFromInput(participants).map((participant, index) => (
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
          <Button
            disabled={mutation.isPending}
            onPress={() =>
              mutation.mutate(undefined, {
                onError: () =>
                  Alert.alert(
                    'No se pudo crear',
                    'Completa los datos e intenta nuevamente.',
                  ),
              })
            }
          >
            {mutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crear gasto</Text>
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
  hint: { color: '#64748B', fontSize: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});

function namesFromInput(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
