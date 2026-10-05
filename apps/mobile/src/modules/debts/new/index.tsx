import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { debtsClient } from '@/api/debts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function DebtCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [debtName, setDebtName] = useState('');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const mutation = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(',', '.'));
      if (
        !debtName.trim() ||
        !person.trim() ||
        !Number.isFinite(value) ||
        value <= 0
      )
        throw new Error('invalid');
      const response = await debtsClient.index.$post({
        json: {
          name: debtName.trim(),
          counterpartyName: person.trim(),
          direction,
          principalAmount: value,
          amounts: [
            { amount: value, loanDate: new Date().toISOString().slice(0, 10) },
          ],
          interestType: 'none',
          currency: 'COP',
        },
      });
      if (!response.ok) throw new Error('failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      router.back();
    },
  });
  return (
    <Screen>
      <ScreenHeader title="Nueva deuda" onBack={() => router.back()} />
      <Card style={styles.card}>
        <Label>Nombre de la deuda</Label>
        <Input
          value={debtName}
          onChangeText={setDebtName}
          placeholder="Préstamo del viaje"
        />
        <Label>Persona</Label>
        <Input value={person} onChangeText={setPerson} placeholder="Nombre" />
        <Label>Monto</Label>
        <Input
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Button
          variant={direction === 'lent' ? 'default' : 'outline'}
          onPress={() => setDirection('lent')}
        >
          <Text style={styles.buttonText}>Me deben</Text>
        </Button>
        <Button
          variant={direction === 'borrowed' ? 'default' : 'outline'}
          onPress={() => setDirection('borrowed')}
        >
          <Text style={styles.buttonText}>Yo debo</Text>
        </Button>
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
            <Text style={styles.buttonText}>Guardar deuda</Text>
          )}
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
