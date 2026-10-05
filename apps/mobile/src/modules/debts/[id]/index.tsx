import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { debtsClient } from '@/api/debts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';

import { formatDebtAmount } from '../format';

type Debt = {
  id: string;
  name: string;
  counterpartyName: string;
  remainingAmount: number;
  principalAmount?: number;
  expectedTotal?: number;
  paidAmount?: number;
  currency: string;
  direction: string;
  description?: string | null;
  status?: string;
  dueDate?: string | null;
  amounts?: Array<{
    id: string;
    amount: number;
    loanDate: string;
    note?: string | null;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paidAt: string;
    note?: string | null;
  }>;
};
type Activity =
  | {
      kind: 'loan';
      id: string;
      amount: number;
      date: string;
      note?: string | null;
    }
  | {
      kind: 'payment';
      id: string;
      amount: number;
      date: string;
      note?: string | null;
    };
type DialogMode = 'edit-debt' | 'activity' | 'edit-activity' | null;

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [payment, setPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentNote, setPaymentNote] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDate, setLoanDate] = useState(today());
  const [addingLoan, setAddingLoan] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [debtName, setDebtName] = useState('');
  const [debtDescription, setDebtDescription] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [activityNote, setActivityNote] = useState('');
  const debtQuery = useQuery({
    queryKey: ['debt', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await debtsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('debt_load_failed');
      return (await response.json()) as Debt;
    },
  });
  const paymentMutation = useMutation({
    mutationFn: async (overrideAmount?: number) => {
      const amount = overrideAmount ?? Number(payment.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid');
      const response = await debtsClient[':id'].payments.$post({
        param: { id: id ?? '' },
        json: {
          amount,
          paidAt: paymentDate,
          ...(paymentNote.trim() ? { note: paymentNote.trim() } : {}),
        },
      });
      if (!response.ok) throw new Error('payment_failed');
    },
    onSuccess: async () => {
      setPayment('');
      setPaymentDate(today());
      setPaymentNote('');
      await queryClient.invalidateQueries({ queryKey: ['debt', id] });
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      await queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await debtsClient[':id'].$delete({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('delete_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      await queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      router.replace('/debts' as never);
    },
  });
  const loanMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(loanAmount.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid');
      const response = await debtsClient[':id'].amounts.$post({
        param: { id: id ?? '' },
        json: {
          amount,
          loanDate,
        },
      });
      if (!response.ok) throw new Error('loan_failed');
    },
    onSuccess: async () => {
      setLoanAmount('');
      setLoanDate(today());
      setAddingLoan(false);
      await queryClient.invalidateQueries({ queryKey: ['debt', id] });
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      await queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });
  const updateDebtMutation = useMutation({
    mutationFn: async () => {
      if (!debt) throw new Error('debt_missing');
      const response = await debtsClient[':id'].$patch({
        param: { id: id ?? '' },
        json: {
          name: debtName.trim(),
          description: debtDescription.trim() || undefined,
          dueDate: debtDueDate || null,
        },
      });
      if (!response.ok) throw new Error('debt_update_failed');
    },
    onSuccess: async () => {
      setDialogMode(null);
      await queryClient.invalidateQueries({ queryKey: ['debt', id] });
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      await queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });
  const updateActivityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedActivity) throw new Error('activity_missing');
      const response =
        selectedActivity.kind === 'loan'
          ? await debtsClient[':id'].amounts[':amountId'].$patch({
              param: { id: id ?? '', amountId: selectedActivity.id },
              json: {
                amount: Number(loanAmount.replace(',', '.')),
                loanDate: activityDate,
              },
            })
          : await debtsClient[':id'].payments[':paymentId'].$patch({
              param: { id: id ?? '', paymentId: selectedActivity.id },
              json: {
                amount: Number(payment.replace(',', '.')),
                paidAt: activityDate,
                note: activityNote.trim(),
              },
            });
      if (!response.ok) throw new Error('activity_update_failed');
    },
    onSuccess: async () => {
      setDialogMode(null);
      setSelectedActivity(null);
      await queryClient.invalidateQueries({ queryKey: ['debt', id] });
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      await queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });
  const deleteActivityMutation = useMutation({
    mutationFn: async (activity: Activity) => {
      const response =
        activity.kind === 'loan'
          ? await debtsClient[':id'].amounts[':amountId'].$delete({
              param: { id: id ?? '', amountId: activity.id },
            })
          : await debtsClient[':id'].payments[':paymentId'].$delete({
              param: { id: id ?? '', paymentId: activity.id },
            });
      if (!response.ok) throw new Error('activity_delete_failed');
    },
    onSuccess: async () => {
      setDialogMode(null);
      setSelectedActivity(null);
      await queryClient.invalidateQueries({ queryKey: ['debt', id] });
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      await queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });
  const debt = debtQuery.data;
  const progress = debt
    ? debt.expectedTotal && debt.expectedTotal > 0
      ? Math.min(100, ((debt.paidAmount ?? 0) / debt.expectedTotal) * 100)
      : 0
    : 0;
  const activities: Activity[] = debt
    ? [
        ...(debt.amounts ?? []).map((item) => ({
          kind: 'loan' as const,
          id: item.id,
          amount: item.amount,
          date: item.loanDate,
          note: item.note,
        })),
        ...(debt.payments ?? []).map((item) => ({
          kind: 'payment' as const,
          id: item.id,
          amount: item.amount,
          date: item.paidAt,
          note: item.note,
        })),
      ].sort((left, right) => right.date.localeCompare(left.date))
    : [];
  const openDebtEditor = () => {
    if (!debt) return;
    setDebtName(debt.name);
    setDebtDescription(debt.description ?? '');
    setDebtDueDate(debt.dueDate?.slice(0, 10) ?? '');
    setDialogMode('edit-debt');
  };
  const openActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setDialogMode('activity');
  };
  const openActivityEditor = () => {
    if (!selectedActivity) return;
    if (selectedActivity.kind === 'loan')
      setLoanAmount(String(selectedActivity.amount));
    else setPayment(String(selectedActivity.amount));
    setActivityDate(selectedActivity.date.slice(0, 10));
    setActivityNote(selectedActivity.note ?? '');
    setDialogMode('edit-activity');
  };
  return (
    <Screen>
      <ScreenHeader
        title={debt?.name ?? t('debts.title')}
        onBack={() => router.replace('/debts' as never)}
      />
      {!debt ? (
        <Spinner color="#DE034D" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderSpacer} />
              <Pressable onPress={openDebtEditor}>
                <Text style={styles.editText}>{t('debts.edit')}</Text>
              </Pressable>
            </View>
            <Text style={styles.title}>{debt.name}</Text>
            <Text style={styles.copy}>
              {debt.direction === 'lent'
                ? `${t('debts.lentTo')} ${debt.counterpartyName}`
                : `${t('debts.borrowedFrom')} ${debt.counterpartyName}`}
            </Text>
            <Text style={styles.amount}>
              {formatDebtAmount(debt.remainingAmount, debt.currency)}
            </Text>
            <Text style={styles.copy}>
              {t('debts.remainingPaid')} ·{' '}
              {formatDebtAmount(debt.paidAmount ?? 0, debt.currency)}{' '}
              {t('debts.percentPaid')} {t('debts.expectedTotal')} {''}
              {formatDebtAmount(
                debt.expectedTotal ??
                  debt.principalAmount ??
                  debt.remainingAmount,
                debt.currency,
              )}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {Math.round(progress)}% {t('debts.percentPaid')}
            </Text>
            {debt.dueDate ? (
              <Text style={styles.copy}>
                {t('debts.duePrefix')}{' '}
                {new Date(debt.dueDate).toLocaleDateString('es-CO')}
              </Text>
            ) : null}
            {debt.description ? (
              <Text style={styles.copy}>{debt.description}</Text>
            ) : null}
            {debt.status === 'paid' ? (
              <Text style={styles.paid}>{t('debts.paidStatus')}</Text>
            ) : (
              <>
                <Input
                  value={payment}
                  onChangeText={setPayment}
                  keyboardType="decimal-pad"
                  placeholder={t('debts.paymentAmountPlaceholder')}
                />
                <Input
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder={t('debts.paymentDatePlaceholder')}
                />
                <Input
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  placeholder={t('debts.paymentNotePlaceholder')}
                />
                <Button
                  disabled={paymentMutation.isPending}
                  onPress={() =>
                    paymentMutation.mutate(undefined, {
                      onError: () =>
                        Alert.alert(
                          'No se pudo registrar',
                          'Intenta nuevamente.',
                        ),
                    })
                  }
                >
                  <Text style={styles.buttonText}>
                    {t('debts.registerPayment')}
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => setAddingLoan((current) => !current)}
                >
                  <Text style={styles.outlineText}>
                    ＋ {t('debts.addLoan')}
                  </Text>
                </Button>
                {addingLoan ? (
                  <View style={styles.loanForm}>
                    <Input
                      value={loanAmount}
                      onChangeText={setLoanAmount}
                      keyboardType="decimal-pad"
                      placeholder={t('debts.newLoanPlaceholder')}
                    />
                    <Input
                      value={loanDate}
                      onChangeText={setLoanDate}
                      placeholder="Fecha del préstamo (AAAA-MM-DD)"
                    />
                    <Button
                      disabled={loanMutation.isPending}
                      onPress={() =>
                        loanMutation.mutate(undefined, {
                          onError: () =>
                            Alert.alert(
                              'No se pudo agregar',
                              'Intenta nuevamente.',
                            ),
                        })
                      }
                    >
                      <Text style={styles.buttonText}>
                        {t('debts.saveAmount')}
                      </Text>
                    </Button>
                  </View>
                ) : null}
                <Button
                  variant="outline"
                  disabled={paymentMutation.isPending}
                  onPress={() =>
                    Alert.alert(
                      'Marcar deuda como pagada',
                      'Se registrará el saldo restante como un abono.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Marcar pagada',
                          onPress: () => {
                            paymentMutation.mutate(debt.remainingAmount, {
                              onError: () =>
                                Alert.alert(
                                  'No se pudo marcar como pagada',
                                  'Intenta nuevamente.',
                                ),
                            });
                          },
                        },
                      ],
                    )
                  }
                >
                  <Text style={styles.outlineText}>{t('debts.markPaid')}</Text>
                </Button>
              </>
            )}
          </Card>
          <Card style={styles.activityCard}>
            <Text style={styles.sectionTitle}>{t('debts.activity')}</Text>
            {activities.length === 0 ? (
              <Text style={styles.copy}>{t('debts.noActivity')}</Text>
            ) : null}
            {activities.map((item) => (
              <Pressable
                key={`${item.kind}-${item.id}`}
                onPress={() => openActivity(item)}
                style={styles.activityRow}
              >
                <View>
                  <Text style={styles.activityLabel}>
                    {item.kind === 'loan'
                      ? t('debts.amountAdded')
                      : t('debts.paymentShort')}
                  </Text>
                  <Text style={styles.copy}>
                    {new Date(item.date).toLocaleDateString('es-CO')}
                  </Text>
                </View>
                <Text style={styles.activityAmount}>
                  {formatDebtAmount(item.amount, debt.currency)}
                </Text>
              </Pressable>
            ))}
          </Card>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onPress={() =>
              Alert.alert('Eliminar deuda', '¿Quieres eliminar esta deuda?', [
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
              ])
            }
          >
            <Text style={styles.delete}>{t('debts.delete')}</Text>
          </Button>
        </ScrollView>
      )}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'edit-debt'
                ? t('debts.editTitle')
                : dialogMode === 'activity'
                  ? selectedActivity?.kind === 'loan'
                    ? t('debts.addLoanTitle')
                    : t('debts.paymentTitle')
                  : t('debts.editMovementTitle')}
            </DialogTitle>
          </DialogHeader>
          {dialogMode === 'edit-debt' ? (
            <View style={styles.dialogFields}>
              <Input
                value={debtName}
                onChangeText={setDebtName}
                placeholder={t('debts.namePlaceholder')}
              />
              <Input
                value={debtDueDate}
                onChangeText={setDebtDueDate}
                placeholder="Fecha de vencimiento (AAAA-MM-DD)"
              />
              <Input
                value={debtDescription}
                onChangeText={setDebtDescription}
                placeholder={t('debts.descriptionLabel')}
              />
            </View>
          ) : dialogMode === 'activity' ? (
            <View style={styles.activityDialog}>
              <Text style={styles.dialogAmount}>
                {selectedActivity
                  ? formatDebtAmount(
                      selectedActivity.amount,
                      debt?.currency ?? 'COP',
                    )
                  : null}
              </Text>
              <Text style={styles.copy}>
                {selectedActivity
                  ? new Date(selectedActivity.date).toLocaleDateString('es-CO')
                  : ''}
              </Text>
              {selectedActivity?.note ? (
                <Text style={styles.copy}>{selectedActivity.note}</Text>
              ) : null}
              <Button onPress={openActivityEditor}>
                <Text style={styles.buttonText}>{t('debts.edit')}</Text>
              </Button>
              <Button
                variant="destructive"
                disabled={deleteActivityMutation.isPending}
                onPress={() => {
                  if (!selectedActivity) return;
                  Alert.alert('Eliminar movimiento', '¿Quieres eliminarlo?', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: () =>
                        deleteActivityMutation.mutate(selectedActivity),
                    },
                  ]);
                }}
              >
                <Text style={styles.delete}>{t('common.delete')}</Text>
              </Button>
            </View>
          ) : (
            <View style={styles.dialogFields}>
              <Input
                value={selectedActivity?.kind === 'loan' ? loanAmount : payment}
                onChangeText={
                  selectedActivity?.kind === 'loan' ? setLoanAmount : setPayment
                }
                keyboardType="decimal-pad"
                placeholder={t('debts.amountPlaceholder')}
              />
              <Input
                value={activityDate}
                onChangeText={setActivityDate}
                placeholder="Fecha (AAAA-MM-DD)"
              />
              {selectedActivity?.kind === 'payment' ? (
                <Input
                  value={activityNote}
                  onChangeText={setActivityNote}
                  placeholder={t('debts.paymentNotePlaceholder')}
                />
              ) : null}
            </View>
          )}
          {dialogMode === 'edit-debt' || dialogMode === 'edit-activity' ? (
            <DialogFooter>
              <Button
                disabled={
                  updateDebtMutation.isPending ||
                  updateActivityMutation.isPending
                }
                onPress={() =>
                  dialogMode === 'edit-debt'
                    ? updateDebtMutation.mutate()
                    : updateActivityMutation.mutate()
                }
              >
                <Text style={styles.buttonText}>{t('debts.save')}</Text>
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  card: { gap: 14, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardHeaderSpacer: { flex: 1 },
  editText: { color: '#DE034D', fontSize: 14, fontWeight: '600' },
  activityCard: { gap: 12, padding: 18 },
  sectionTitle: { color: '#0F172A', fontSize: 18, fontWeight: '600' },
  activityRow: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  activityLabel: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  activityAmount: { color: '#DE034D', fontSize: 14, fontWeight: '600' },
  loanForm: { gap: 10 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressBar: {
    backgroundColor: '#DE034D',
    borderRadius: 999,
    height: '100%',
  },
  progressLabel: { color: '#64748B', fontSize: 12, textAlign: 'right' },
  paid: { color: '#15803D', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  dialogFields: { gap: 12 },
  activityDialog: { gap: 12 },
  dialogAmount: { color: '#DE034D', fontSize: 26, fontWeight: '600' },
});

function today() {
  return new Date().toISOString().slice(0, 10);
}
