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
  const [emoji, setEmoji] = useState('💰');
  const [currency, setCurrency] = useState('COP');
  const [targetAmount, setTargetAmount] = useState('');
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 12);
    return date.toISOString().slice(0, 10);
  });
  const [installmentCount, setInstallmentCount] = useState('1');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [suggestedContributionAmount, setSuggestedContributionAmount] =
    useState('');
  const [participants, setParticipants] = useState('');
  const [goalType, setGoalType] = useState<
    'saving' | 'trip' | 'gift' | 'event' | 'custom'
  >('saving');
  const [contributionMode, setContributionMode] = useState<
    'manual' | 'monthly' | 'flexible' | 'suggested'
  >('manual');
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
      const parsedInstallmentAmount = installmentAmount
        ? Number(installmentAmount.replace(',', '.'))
        : undefined;
      const parsedSuggestedAmount = suggestedContributionAmount
        ? Number(suggestedContributionAmount.replace(',', '.'))
        : undefined;
      if (
        (parsedInstallmentAmount !== undefined &&
          (!Number.isFinite(parsedInstallmentAmount) ||
            parsedInstallmentAmount <= 0)) ||
        (parsedSuggestedAmount !== undefined &&
          (!Number.isFinite(parsedSuggestedAmount) ||
            parsedSuggestedAmount <= 0))
      )
        throw new Error('invalid');
      const response = await goalsClient.index.$post({
        json: {
          name: name.trim(),
          description: description.trim() || undefined,
          emoji: emoji.trim() || undefined,
          themeColor:
            goalType === 'trip'
              ? '#0EA5E9'
              : goalType === 'gift'
                ? '#F97316'
                : goalType === 'event'
                  ? '#E11D48'
                  : goalType === 'custom'
                    ? '#7C3AED'
                    : '#10B981',
          currency: currency.trim().toUpperCase(),
          targetAmount: target,
          startDate,
          endDate,
          installmentCount: installments,
          ...(parsedInstallmentAmount !== undefined
            ? { installmentAmount: parsedInstallmentAmount }
            : {}),
          ...(parsedSuggestedAmount !== undefined
            ? { suggestedContributionAmount: parsedSuggestedAmount }
            : {}),
          goalType,
          contributionMode,
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
          {(['saving', 'trip', 'gift', 'event', 'custom'] as const).map(
            (type) => (
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
                        : type === 'event'
                          ? 'Evento'
                          : 'Personalizada'}
                </Text>
              </Button>
            ),
          )}
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
          <Label>Emoji</Label>
          <Input value={emoji} onChangeText={setEmoji} placeholder="💰" />
          <Label>Moneda</Label>
          <Input
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            placeholder="COP"
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
          <Label>Modo de aporte</Label>
          {(['manual', 'monthly', 'flexible', 'suggested'] as const).map(
            (mode) => (
              <Button
                key={mode}
                variant={contributionMode === mode ? 'default' : 'outline'}
                onPress={() => setContributionMode(mode)}
              >
                <Text style={styles.buttonText}>
                  {mode === 'manual'
                    ? 'Manual'
                    : mode === 'monthly'
                      ? 'Mensual'
                      : mode === 'flexible'
                        ? 'Flexible'
                        : 'Sugerido'}
                </Text>
              </Button>
            ),
          )}
          <Label>Fecha de inicio</Label>
          <Input
            value={startDate}
            onChangeText={setStartDate}
            placeholder="AAAA-MM-DD"
          />
          <Label>Fecha de finalización</Label>
          <Input
            value={endDate}
            onChangeText={setEndDate}
            placeholder="AAAA-MM-DD"
          />
          <Label>Aporte por cuota (opcional)</Label>
          <Input
            value={installmentAmount}
            onChangeText={setInstallmentAmount}
            keyboardType="decimal-pad"
            placeholder="Calculado automáticamente"
          />
          <Label>Aporte sugerido (opcional)</Label>
          <Input
            value={suggestedContributionAmount}
            onChangeText={setSuggestedContributionAmount}
            keyboardType="decimal-pad"
            placeholder="0"
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
