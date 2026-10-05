import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { goalsClient } from '@/api/goals';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GoalCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [participants, setParticipants] = useState('');
  const [goalType, setGoalType] = useState<
    'saving' | 'trip' | 'gift' | 'event'
  >('saving');
  const mutation = useMutation({
    mutationFn: async () => {
      const target = Number(targetAmount.replace(',', '.'));
      const installments = Number(installmentCount);
      if (
        !name.trim() ||
        !Number.isFinite(target) ||
        target <= 0 ||
        !Number.isInteger(installments) ||
        installments <= 0
      )
        throw new Error('invalid');
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + installments);
      const response = await goalsClient.index.$post({
        json: {
          name: name.trim(),
          description: description.trim() || undefined,
          currency: 'COP',
          targetAmount: target,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          installmentCount: installments,
          installmentAmount: target / installments,
          goalType,
          contributionMode: installments > 1 ? 'monthly' : 'manual',
          participants: participants
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => ({ name: value })),
        },
      });
      if (!response.ok) throw new Error('failed');
      return response.json();
    },
    onSuccess: async (goal) => {
      await queryClient.invalidateQueries({ queryKey: ['goals-list'] });
      router.replace(`/goals/${goal.id}` as never);
    },
  });
  return (
    <Screen>
      <ScreenHeader title="Nueva meta" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Label>Tipo de meta</Label>
          {(['saving', 'trip', 'gift', 'event'] as const).map((type) => (
            <Button
              key={type}
              variant={goalType === type ? 'default' : 'outline'}
              onPress={() => setGoalType(type)}
            >
              <Text style={styles.buttonText}>
                {type === 'saving'
                  ? 'Ahorro'
                  : type === 'trip'
                    ? 'Viaje'
                    : type === 'gift'
                      ? 'Regalo'
                      : 'Evento'}
              </Text>
            </Button>
          ))}
          <Label>Nombre</Label>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Viaje a Europa"
          />
          <Label>Descripción</Label>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Opcional"
          />
          <Label>Monto objetivo</Label>
          <Input
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Label>Cuotas mensuales</Label>
          <Input
            value={installmentCount}
            onChangeText={setInstallmentCount}
            keyboardType="number-pad"
            placeholder="1"
          />
          <Label>Participantes</Label>
          <Input
            value={participants}
            onChangeText={setParticipants}
            placeholder="Ana, Carlos"
          />
          <Text style={styles.hint}>Sepáralos con comas.</Text>
          <Button
            disabled={mutation.isPending}
            onPress={() =>
              mutation.mutate(undefined, {
                onError: () =>
                  Alert.alert(
                    'No se pudo crear',
                    'Revisa los datos e intenta nuevamente.',
                  ),
              })
            }
          >
            {mutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crear meta</Text>
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
});
