import { useQuery } from '@tanstack/react-query';
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
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { type Activity, formatDebtAmount } from '../format';
import { useDebtMutations } from '../use-debt-mutations';

type DialogMode = 'edit-debt' | 'activity' | 'edit-activity' | null;

export default function DebtDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
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
    ...api.debts.get.queryOptions({ params: { id } }),
    enabled: Boolean(id),
  });
  const mutations = useDebtMutations(id);
  const debt = debtQuery.data;
  const progress = debt
    ? debt.expectedTotal > 0
      ? Math.min(100, (debt.paidAmount / debt.expectedTotal) * 100)
      : 0
    : 0;
  const activities: Activity[] = debt
    ? [
        ...debt.amounts.map((item) => ({
          kind: 'loan' as const,
          id: item.id,
          amount: item.amount,
          date: item.loanDate.toISOString(),
        })),
        ...debt.payments.map((item) => ({
          kind: 'payment' as const,
          id: item.id,
          amount: item.amount,
          date: item.paidAt.toISOString(),
          note: item.note,
        })),
      ].sort((left, right) => right.date.localeCompare(left.date))
    : [];
  const resetPayment = () => {
    setPayment('');
    setPaymentDate(today());
    setPaymentNote('');
  };
  const closeActivity = () => {
    setDialogMode(null);
    setSelectedActivity(null);
  };
  const saveDialog = () => {
    if (dialogMode === 'edit-debt')
      return mutations.update.mutate(
        {
          name: debtName,
          description: debtDescription,
          dueDate: debtDueDate,
        },
        { onSuccess: () => setDialogMode(null) },
      );
    if (!selectedActivity) return;
    mutations.updateActivity.mutate(
      {
        activity: selectedActivity,
        amount: selectedActivity.kind === 'loan' ? loanAmount : payment,
        date: activityDate,
        note: activityNote,
      },
      { onSuccess: closeActivity },
    );
  };
  const openDebtEditor = () => {
    if (!debt) return;
    setDebtName(debt.name);
    setDebtDescription(debt.description ?? '');
    setDebtDueDate(debt.dueDate?.toISOString().slice(0, 10) ?? '');
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
              {formatDebtAmount(debt.paidAmount, debt.currency)}{' '}
              {t('debts.percentPaid')} {t('debts.expectedTotal')} {''}
              {formatDebtAmount(debt.expectedTotal, debt.currency)}
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
                {debt.dueDate.toLocaleDateString('es-CO')}
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
                  disabled={mutations.payment.isPending}
                  onPress={() =>
                    mutations.payment.mutate(
                      { amount: payment, date: paymentDate, note: paymentNote },
                      {
                        onSuccess: resetPayment,
                        onError: () =>
                          Alert.alert(
                            'No se pudo registrar',
                            'Intenta nuevamente.',
                          ),
                      },
                    )
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
                      disabled={mutations.loan.isPending}
                      onPress={() =>
                        mutations.loan.mutate(
                          { amount: loanAmount, date: loanDate },
                          {
                            onSuccess: () => {
                              setLoanAmount('');
                              setLoanDate(today());
                              setAddingLoan(false);
                            },
                            onError: () =>
                              Alert.alert(
                                'No se pudo agregar',
                                'Intenta nuevamente.',
                              ),
                          },
                        )
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
                  disabled={mutations.payment.isPending}
                  onPress={() =>
                    Alert.alert(
                      'Marcar deuda como pagada',
                      'Se registrará el saldo restante como un abono.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Marcar pagada',
                          onPress: () => {
                            mutations.payment.mutate(
                              {
                                amount: String(debt.remainingAmount),
                                date: paymentDate,
                                note: paymentNote,
                              },
                              {
                                onSuccess: resetPayment,
                                onError: () =>
                                  Alert.alert(
                                    'No se pudo marcar como pagada',
                                    'Intenta nuevamente.',
                                  ),
                              },
                            );
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
            disabled={mutations.remove.isPending}
            onPress={() =>
              Alert.alert('Eliminar deuda', '¿Quieres eliminar esta deuda?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () =>
                    mutations.remove.mutate(undefined, {
                      onSuccess: () => router.replace('/debts' as never),
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
                disabled={mutations.deleteActivity.isPending}
                onPress={() => {
                  if (!selectedActivity) return;
                  Alert.alert('Eliminar movimiento', '¿Quieres eliminarlo?', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: () =>
                        mutations.deleteActivity.mutate(selectedActivity, {
                          onSuccess: closeActivity,
                        }),
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
                  mutations.update.isPending ||
                  mutations.updateActivity.isPending
                }
                onPress={saveDialog}
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
