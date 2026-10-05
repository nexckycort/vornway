import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { goalsClient } from '@/api/goals';
import { usersClient } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { useUsernameRequirement } from '../../username/use-username-requirement';
import { formatGoalAmount } from '../format';

export default function GoalCreateScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const queryClient = useQueryClient();
  const { ensureUsername, usernameDialog } = useUsernameRequirement();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Regalos para Navidad');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [currency, setCurrency] = useState('COP');
  const [targetAmount, setTargetAmount] = useState('2200000');
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(11, 20);
    return date.toISOString().slice(0, 10);
  });
  const [installmentCount, setInstallmentCount] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [suggestedContributionAmount, setSuggestedContributionAmount] =
    useState('');
  const [participants, setParticipants] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [debouncedParticipantSearch, setDebouncedParticipantSearch] =
    useState('');
  const [linkedParticipants, setLinkedParticipants] = useState<
    Array<{ name: string; userId: string; email?: string | null }>
  >([]);
  const [goalType, setGoalType] = useState<
    'saving' | 'trip' | 'gift' | 'event' | 'custom'
  >('gift');
  const [contributionMode, setContributionMode] = useState<
    'manual' | 'monthly' | 'flexible' | 'suggested'
  >('monthly');
  const participantCount =
    participants
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length +
    linkedParticipants.length +
    1;
  const previewTarget = Number(targetAmount.replace(',', '.')) || 0;
  const previewInstallments = Math.max(1, Number(installmentCount) || 1);
  const previewContribution = installmentAmount
    ? Number(installmentAmount.replace(',', '.')) || 0
    : previewTarget / previewInstallments / participantCount;
  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedParticipantSearch(participantSearch.trim()),
      250,
    );
    return () => clearTimeout(timeout);
  }, [participantSearch]);
  const participantSearchQuery = useQuery({
    queryKey: ['goal-participant-search', debouncedParticipantSearch],
    enabled: debouncedParticipantSearch.length > 1,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: debouncedParticipantSearch },
      });
      if (!response.ok) throw new Error('participant_search_failed');
      return response.json() as Promise<{
        data: Array<{
          id: string;
          name: string;
          username?: string | null;
          email?: string | null;
          isCurrentUser?: boolean;
        }>;
      }>;
    },
  });
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
      if (!startDate || !endDate || endDate < startDate) {
        throw new Error('invalid');
      }
      const manualParticipants = participants
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const participantCount =
        manualParticipants.length + linkedParticipants.length + 1;
      const calculatedSuggestedAmount =
        parsedInstallmentAmount ??
        Math.round(target / installments / Math.max(1, participantCount));
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
          suggestedContributionAmount:
            parsedSuggestedAmount ?? calculatedSuggestedAmount,
          goalType,
          contributionMode,
          participants: [
            ...manualParticipants.map((value) => ({ name: value })),
            ...linkedParticipants,
          ],
        },
      });
      if (!response.ok) throw new Error('failed');
      return response.json();
    },
    onSuccess: async (goal) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goals-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      router.replace({
        pathname: '/goals/[id]',
        params: { id: goal.id, from: from === 'home' ? 'home' : 'goals' },
      } as never);
    },
  });

  async function submitGoal() {
    if (!(await ensureUsername())) return;
    mutation.mutate(undefined, {
      onError: () => Alert.alert(t('goals.loadError'), t('common.retry')),
    });
  }

  function goBack() {
    if (step > 0) {
      setStep((current) => current - 1);
      return;
    }
    router.replace(
      from === 'home' ? ('/(tabs)' as never) : ('/goals' as never),
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('goals.newTitle')} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.step}>
            {
              [
                t('goals.stepOne'),
                t('goals.stepTwo'),
                t('goals.stepThree'),
                t('goals.stepFour'),
                t('goals.stepFive'),
                t('goals.stepSix'),
              ][step]
            }
          </Text>
          <View style={step === 0 ? undefined : styles.hidden}>
            <Label>{t('goals.whatTitle')}</Label>
            {(['saving', 'trip', 'gift', 'event', 'custom'] as const).map(
              (type) => (
                <Button
                  key={type}
                  variant={goalType === type ? 'default' : 'outline'}
                  onPress={() => {
                    setGoalType(type);
                    setEmoji(
                      type === 'trip'
                        ? '✈️'
                        : type === 'gift'
                          ? '🎁'
                          : type === 'event'
                            ? '🎉'
                            : type === 'saving'
                              ? '💰'
                              : '✨',
                    );
                  }}
                >
                  <Text style={styles.buttonText}>
                    {type === 'saving'
                      ? t('goals.typeSaving')
                      : type === 'trip'
                        ? t('goals.typeTrip')
                        : type === 'gift'
                          ? t('goals.typeGift')
                          : type === 'event'
                            ? t('goals.typeEvent')
                            : t('goals.typeCustom')}
                  </Text>
                </Button>
              ),
            )}
          </View>
          <View style={step === 1 ? undefined : styles.hidden}>
            <Label>{t('goals.emojiAria')}</Label>
            <Input
              value={emoji}
              onChangeText={(value) => setEmoji(value.slice(0, 8))}
              placeholder={t('goals.emojiAria')}
            />
            <Label>{t('goals.namePlaceholder')}</Label>
            <Input
              value={name}
              onChangeText={setName}
              placeholder={t('goals.namePlaceholder')}
            />
            <Label>{t('goals.descriptionPlaceholder')}</Label>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder={t('goals.descriptionPlaceholder')}
            />
          </View>
          <View style={step === 2 ? undefined : styles.hidden}>
            <Label>{t('goals.currency')}</Label>
            <Input
              value={currency}
              onChangeText={setCurrency}
              autoCapitalize="characters"
              placeholder="COP"
            />
            <Label>{t('goals.objective')}</Label>
            <Input
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <Label>{t('goals.start')}</Label>
            <Input
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
            />
            <Label>{t('goals.end')}</Label>
            <Input
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={step === 3 ? undefined : styles.hidden}>
            <Label>{t('goals.monthsPlaceholder')}</Label>
            <Input
              value={installmentCount}
              onChangeText={setInstallmentCount}
              keyboardType="number-pad"
              placeholder="1"
            />
            <Label>{t('goals.contributionModeTitle')}</Label>
            {(['manual', 'monthly', 'flexible', 'suggested'] as const).map(
              (mode) => (
                <Button
                  key={mode}
                  variant={contributionMode === mode ? 'default' : 'outline'}
                  onPress={() => setContributionMode(mode)}
                >
                  <Text style={styles.buttonText}>
                    {mode === 'manual'
                      ? t('goals.modeManual')
                      : mode === 'monthly'
                        ? t('goals.modeMonthly')
                        : mode === 'flexible'
                          ? t('goals.modeFlexible')
                          : t('goals.modeSuggested')}
                  </Text>
                </Button>
              ),
            )}
            <Label>{t('goals.optionalQuotaPlaceholder')}</Label>
            <Input
              value={installmentAmount}
              onChangeText={setInstallmentAmount}
              keyboardType="decimal-pad"
              placeholder={t('goals.suggestedQuota')}
            />
            <Label>{t('goals.suggestedQuota')}</Label>
            <Input
              value={suggestedContributionAmount}
              onChangeText={setSuggestedContributionAmount}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <Text style={styles.hint}>
              Aporte estimado por persona:{' '}
              {formatGoalAmount(
                previewContribution,
                currency.trim().toUpperCase() || 'COP',
              )}{' '}
              · {participantCount}{' '}
              {participantCount === 1
                ? t('goals.onlyYou')
                : t('goals.peopleCount', { count: participantCount })}
            </Text>
          </View>
          <View style={step === 4 ? undefined : styles.hidden}>
            <Label>{t('goals.addPeopleTitle')}</Label>
            <Input
              value={participants}
              onChangeText={setParticipants}
              placeholder={t('goals.peoplePlaceholder')}
            />
            <Text style={styles.hint}>Sepáralos con comas.</Text>
            <Input
              value={participantSearch}
              onChangeText={setParticipantSearch}
              placeholder={t('goals.peoplePlaceholder')}
            />
            {participantSearchQuery.data?.data?.map((participant) => (
              <Button
                key={participant.id}
                variant="outline"
                disabled={participant.isCurrentUser}
                onPress={() => {
                  if (participant.isCurrentUser) return;
                  if (
                    linkedParticipants.some(
                      (current) => current.userId === participant.id,
                    )
                  )
                    return;
                  setLinkedParticipants((current) => [
                    ...current,
                    {
                      name: participant.name,
                      userId: participant.id,
                      email: participant.email,
                    },
                  ]);
                  setParticipantSearch('');
                }}
              >
                <Text style={styles.outlineText}>
                  {participant.name}
                  {participant.username ? ` · @${participant.username}` : ''}
                  {!participant.username && participant.email
                    ? ` · ${participant.email}`
                    : ''}
                  {participant.isCurrentUser ? ' · Tú' : ''}
                </Text>
              </Button>
            ))}
            {linkedParticipants.map((participant) => (
              <Button
                key={participant.userId}
                variant="ghost"
                onPress={() =>
                  setLinkedParticipants((current) =>
                    current.filter(
                      (item) => item.userId !== participant.userId,
                    ),
                  )
                }
              >
                <Text style={styles.hint}>
                  ✓ {participant.name}
                  {participant.email ? ` · ${participant.email}` : ''} · Quitar
                </Text>
              </Button>
            ))}
          </View>
          {step === 5 ? (
            <View style={styles.previewBox}>
              <Text style={styles.sectionTitle}>{t('goals.previewTitle')}</Text>
              <Text style={styles.preview}>
                {emoji} {name || t('goals.newTitle')}
              </Text>
              <Text style={styles.copy}>
                {t('goals.objective')}:{' '}
                {formatGoalAmount(
                  previewTarget,
                  currency.trim().toUpperCase() || 'COP',
                )}
              </Text>
              <Text style={styles.copy}>
                {t('goals.suggestedQuota')}:{' '}
                {formatGoalAmount(
                  previewContribution,
                  currency.trim().toUpperCase() || 'COP',
                )}{' '}
                {t('goals.perPerson')}
              </Text>
              <Text style={styles.copy}>
                {t('goals.members')}: {participantCount}
              </Text>
              <Text style={styles.hint}>
                {installmentCount} {t('goals.monthsPlaceholder')}
              </Text>
            </View>
          ) : null}
          <Button
            disabled={step === 5 && mutation.isPending}
            onPress={() => {
              if (step < 5) {
                setStep((current) => current + 1);
              } else {
                void submitGoal();
              }
            }}
          >
            {step === 5 && mutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {step < 5 ? t('common.continue') : t('goals.createNew')}
              </Text>
            )}
          </Button>
        </Card>
      </ScrollView>
      {usernameDialog}
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 152 },
  card: { gap: 12, margin: 16, padding: 18 },
  hidden: { display: 'none' },
  hint: { color: '#64748B', fontSize: 12 },
  step: { color: '#DE034D', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  sectionTitle: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    gap: 8,
    padding: 16,
  },
  preview: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
