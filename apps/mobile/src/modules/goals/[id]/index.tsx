import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { goalsClient } from '@/api/goals';
import { groupsClient } from '@/api/groups';
import { usersClient } from '@/api/users';
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
import { Progress } from '@/components/ui/progress';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

import { formatGoalAmount } from '../format';

type Member = { id: string; name: string };
type Contribution = {
  id: string;
  member?: { name: string };
  amount: number;
  currency: string;
  contributedAt?: string;
  notes?: string | null;
};
type Goal = {
  title: string;
  description?: string | null;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  endDate?: string;
  contributionMode?: 'manual' | 'monthly' | 'flexible' | 'suggested';
  progress?: number;
  startDate?: string;
  daysLeft?: number;
  monthlyTarget?: number;
  installmentCount?: number;
  suggestedContributionAmount?: number;
  members?: Member[];
  group?: { id: string; name?: string };
  contributions?: Contribution[];
  participantCount?: number;
  stats?: {
    remainingAmount: number;
    averageContribution: number;
    currentMonthContributionTotal?: number;
    contributorsThisMonth: number;
    pendingMembersThisMonth: number;
  };
  memberStats?: Array<{
    memberId: string;
    totalAmount: number;
    contributionCount: number;
    contributedThisMonth: boolean;
  }>;
  myMembership?: { role: string } | null;
};

function buildTimeline(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const items: Array<{ key: string; label: string; date: Date }> = [];
  while (cursor <= last && items.length < 18) {
    items.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: cursor.toLocaleDateString('es-CO', { month: 'short' }),
      date: new Date(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return items;
}

export default function GoalDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drawer, setDrawer] = useState<'edit' | 'contribution' | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contributionMode, setContributionMode] = useState<
    'manual' | 'monthly' | 'flexible' | 'suggested'
  >('manual');
  const [memberId, setMemberId] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDate, setContributionDate] = useState('');
  const [contributionNotes, setContributionNotes] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [debouncedParticipantSearch, setDebouncedParticipantSearch] =
    useState('');
  const goalQuery = useQuery({
    queryKey: ['goal-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await goalsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('goal_load_failed');
      return (await response.json()) as unknown as Goal;
    },
  });
  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedParticipantSearch(participantSearch.trim()),
      250,
    );
    return () => clearTimeout(timeout);
  }, [participantSearch]);
  const userSearchQuery = useQuery({
    queryKey: ['goal-member-search', debouncedParticipantSearch],
    enabled: debouncedParticipantSearch.length > 1,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: debouncedParticipantSearch },
      });
      if (!response.ok) throw new Error('member_search_failed');
      return response.json() as Promise<{
        data: Array<{
          id: string;
          name: string;
          username?: string | null;
          isCurrentUser?: boolean;
        }>;
      }>;
    },
  });
  const addMemberMutation = useMutation({
    mutationFn: async (member: { name: string; linkedUserId?: string }) => {
      if (!goal?.group?.id) throw new Error('group_missing');
      const response = await groupsClient[':id'].members.$post({
        param: { id: goal.group.id },
        json: member,
      });
      if (!response.ok) throw new Error('member_add_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goal-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setParticipantSearch('');
    },
  });
  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await goalsClient[':id'].$patch({
        param: { id: id ?? '' },
        json: {
          name: title.trim(),
          description: description.trim(),
          targetAmount: Number(targetAmount.replace(',', '.')),
          ...(endDate ? { endDate } : {}),
          contributionMode,
        },
      });
      if (!response.ok) throw new Error('goal_update_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goal-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['goals-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setDrawer(null);
    },
  });
  const contributionMutation = useMutation({
    mutationFn: async () => {
      const response = await goalsClient[':id'].contributions.$post({
        param: { id: id ?? '' },
        json: {
          memberId,
          amount: Number(contributionAmount.replace(',', '.')),
          ...(contributionDate
            ? { contributedAt: new Date(contributionDate) }
            : {}),
          ...(contributionNotes.trim()
            ? { notes: contributionNotes.trim() }
            : {}),
        },
      });
      if (!response.ok) throw new Error('goal_contribution_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goal-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['goals-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setDrawer(null);
      setContributionAmount('');
    },
  });
  const deleteContributionMutation = useMutation({
    mutationFn: async (contributionId: string) => {
      const response = await goalsClient[':id'].contributions[
        ':contributionId'
      ].$delete({
        param: { id: id ?? '', contributionId },
      });
      if (!response.ok) throw new Error('goal_contribution_delete_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goal-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['goals-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });
  const goal = goalQuery.data;
  const isAdmin = goal?.myMembership?.role === 'admin';
  const progress = goal
    ? Math.max(
        0,
        Math.min(
          100,
          goal.progress ?? (goal.savedAmount / goal.targetAmount) * 100,
        ),
      )
    : 0;
  const timeline = buildTimeline(goal?.startDate, goal?.endDate);
  const membersOnTrack = goal?.memberStats
    ? goal.memberStats.filter((item) => {
        const expected =
          goal.savedAmount / Math.max(goal.participantCount ?? 0, 1);
        return item.totalAmount + 0.01 >= expected;
      }).length
    : 0;
  const pendingMembers = Math.max(
    0,
    (goal?.participantCount ?? goal?.members?.length ?? 0) - membersOnTrack,
  );
  function openEdit() {
    if (!goal) return;
    setTitle(goal.title);
    setDescription(goal.description ?? '');
    setTargetAmount(String(goal.targetAmount));
    setEndDate(goal.endDate?.slice(0, 10) ?? '');
    setContributionMode(goal.contributionMode ?? 'manual');
    setDrawer('edit');
  }
  function saveEdit() {
    const value = Number(targetAmount.replace(',', '.'));
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return;
    void updateMutation
      .mutateAsync()
      .catch(() => Alert.alert('No se pudo actualizar', 'Intenta nuevamente.'));
  }
  function saveContribution() {
    const value = Number(contributionAmount.replace(',', '.'));
    if (!isAdmin || !memberId || !Number.isFinite(value) || value <= 0) return;
    void contributionMutation
      .mutateAsync()
      .catch(() => Alert.alert('No se pudo registrar', 'Intenta nuevamente.'));
  }
  return (
    <Screen>
      <ScreenHeader
        title={goal?.title ?? 'Meta'}
        onBack={() =>
          router.replace(
            from === 'home' ? ('/(tabs)' as never) : ('/goals' as never),
          )
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {goalQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : goalQuery.isError || !goal ? (
          <Card style={styles.card}>
            <Text style={styles.title}>No se pudo cargar la meta</Text>
            <Button onPress={() => void goalQuery.refetch()}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={styles.title}>{goal.title}</Text>
              <Text style={styles.copy}>
                {goal.description || 'Sigue avanzando hacia tu objetivo.'}
              </Text>
              <Progress value={progress} />
              <Text style={styles.copy}>
                {formatGoalAmount(goal.savedAmount, goal.currency)} de{' '}
                {formatGoalAmount(goal.targetAmount, goal.currency)}
              </Text>
              {goal.daysLeft !== undefined ? (
                <Text style={styles.memberMeta}>
                  {goal.daysLeft >= 0
                    ? `${goal.daysLeft} días restantes`
                    : 'Meta finalizada'}
                </Text>
              ) : null}
              <Button onPress={openEdit}>
                <Text style={styles.buttonText}>Editar meta</Text>
              </Button>
            </Card>
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statLabel}>Este mes</Text>
                  <Text style={styles.statValue}>
                    {formatGoalAmount(
                      goal.stats?.currentMonthContributionTotal ?? 0,
                      goal.currency,
                    )}
                  </Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>Al día</Text>
                  <Text style={styles.statValue}>{membersOnTrack}</Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>Pendientes</Text>
                  <Text style={styles.statValue}>{pendingMembers}</Text>
                </View>
              </View>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.section}>Participantes</Text>
              {goal.stats ? (
                <Text style={styles.copy}>
                  {goal.stats.contributorsThisMonth} de{' '}
                  {goal.participantCount ?? goal.members?.length ?? 0} aportaron
                  este mes · {goal.stats.pendingMembersThisMonth} pendientes
                </Text>
              ) : null}
              <Input
                value={participantSearch}
                onChangeText={setParticipantSearch}
                placeholder="Buscar usuario o escribir nombre"
              />
              <Button
                variant="outline"
                disabled={
                  addMemberMutation.isPending || !participantSearch.trim()
                }
                onPress={() =>
                  addMemberMutation.mutate({
                    name: participantSearch.trim(),
                  })
                }
              >
                <Text style={styles.outlineText}>
                  Agregar participante manual
                </Text>
              </Button>
              {userSearchQuery.data?.data?.map((candidate) => (
                <Button
                  key={candidate.id}
                  variant="outline"
                  disabled={
                    addMemberMutation.isPending || candidate.isCurrentUser
                  }
                  onPress={() =>
                    candidate.isCurrentUser
                      ? undefined
                      : addMemberMutation.mutate({
                          name: candidate.name,
                          linkedUserId: candidate.id,
                        })
                  }
                >
                  <Text style={styles.outlineText}>
                    {candidate.name}
                    {candidate.username ? ` · @${candidate.username}` : ''}
                    {candidate.isCurrentUser ? ' · Tú' : ''}
                  </Text>
                </Button>
              ))}
              {goal.members?.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <Text style={styles.copy}>{member.name}</Text>
                  <Text style={styles.memberMeta}>
                    {formatGoalAmount(
                      goal.memberStats?.find(
                        (item) => item.memberId === member.id,
                      )?.totalAmount ?? 0,
                      goal.currency,
                    )}
                    {goal.memberStats?.find(
                      (item) => item.memberId === member.id,
                    )?.contributedThisMonth
                      ? ' · Este mes'
                      : ''}
                  </Text>
                </View>
              ))}
              <Button
                disabled={
                  addMemberMutation.isPending || !participantSearch.trim()
                }
                onPress={() =>
                  addMemberMutation.mutate({ name: participantSearch.trim() })
                }
              >
                <Text style={styles.buttonText}>Agregar participante</Text>
              </Button>
            </Card>
            {timeline.length > 0 ? (
              <Card style={styles.card}>
                <Text style={styles.section}>Calendario de aportes</Text>
                <Text style={styles.copy}>
                  {goal.installmentCount ?? timeline.length} cuotas
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeline}
                >
                  {timeline.map((item, index) => {
                    const active = item.date <= new Date();
                    return (
                      <View key={item.key} style={styles.timelineItem}>
                        <View
                          style={[
                            styles.timelineDot,
                            active && styles.timelineDotActive,
                          ]}
                        />
                        <Text style={styles.timelineLabel}>{item.label}</Text>
                        <Text style={styles.memberMeta}>
                          {index === 0
                            ? 'Inicio'
                            : `${goal.monthlyTarget ?? goal.suggestedContributionAmount ?? 0} ${goal.currency}`}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </Card>
            ) : null}
            <Card style={styles.card}>
              <Text style={styles.section}>Contribuciones</Text>
              {goal.contributions?.map((item) => (
                <React.Fragment key={item.id}>
                  <Text style={styles.copy}>
                    {item.member?.name ?? 'Participante'} · {item.amount}{' '}
                    {goal.currency}
                    {item.contributedAt
                      ? ` · ${new Date(item.contributedAt).toLocaleDateString('es-CO')}`
                      : ''}
                  </Text>
                  {item.notes ? (
                    <Text style={styles.memberMeta}>{item.notes}</Text>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteContributionMutation.isPending}
                    onPress={() =>
                      Alert.alert(
                        'Eliminar contribución',
                        'Esta acción no se puede deshacer.',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Eliminar',
                            style: 'destructive',
                            onPress: () =>
                              deleteContributionMutation.mutate(item.id),
                          },
                        ],
                      )
                    }
                  >
                    <Text style={styles.delete}>Eliminar</Text>
                  </Button>
                </React.Fragment>
              ))}
              <Button
                variant="outline"
                disabled={!isAdmin || !goal.members?.length}
                onPress={() => {
                  setMemberId(goal.members?.[0]?.id ?? '');
                  setContributionAmount(
                    goal.suggestedContributionAmount
                      ? String(Math.round(goal.suggestedContributionAmount))
                      : '',
                  );
                  setContributionDate(new Date().toISOString().slice(0, 10));
                  setContributionNotes('');
                  setDrawer('contribution');
                }}
              >
                <Text style={styles.outlineText}>Agregar contribución</Text>
              </Button>
            </Card>
          </>
        )}
      </ScrollView>
      <Drawer
        open={drawer !== null}
        onOpenChange={(open) => !open && setDrawer(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {drawer === 'edit' ? 'Editar meta' : 'Nueva contribución'}
            </DrawerTitle>
          </DrawerHeader>
          {drawer === 'edit' ? (
            <>
              <Label>Nombre</Label>
              <Input value={title} onChangeText={setTitle} />
              <Label>Descripción</Label>
              <Input value={description} onChangeText={setDescription} />
              <Label>Monto objetivo</Label>
              <Input
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="decimal-pad"
              />
              <Label>Fecha de finalización</Label>
              <Input
                value={endDate}
                onChangeText={setEndDate}
                placeholder="AAAA-MM-DD"
              />
              <Label>Modo de aporte</Label>
              {(['manual', 'monthly', 'flexible', 'suggested'] as const).map(
                (mode) => (
                  <Button
                    key={mode}
                    variant={contributionMode === mode ? 'default' : 'outline'}
                    onPress={() => setContributionMode(mode)}
                  >
                    <Text
                      style={
                        contributionMode === mode
                          ? styles.buttonText
                          : styles.outlineText
                      }
                    >
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
            </>
          ) : (
            <>
              <Label>Participante</Label>
              {goal?.members?.map((member) => (
                <Button
                  key={member.id}
                  variant={memberId === member.id ? 'default' : 'outline'}
                  onPress={() => setMemberId(member.id)}
                >
                  <Text
                    style={
                      memberId === member.id
                        ? styles.buttonText
                        : styles.outlineText
                    }
                  >
                    {member.name}
                  </Text>
                </Button>
              ))}
              <Label>Monto</Label>
              <Input
                value={contributionAmount}
                onChangeText={setContributionAmount}
                keyboardType="decimal-pad"
              />
              <Label>Fecha</Label>
              <Input
                value={contributionDate}
                onChangeText={setContributionDate}
                placeholder="AAAA-MM-DD"
              />
              <Label>Notas</Label>
              <Input
                value={contributionNotes}
                onChangeText={setContributionNotes}
                placeholder="Opcional"
              />
            </>
          )}
          <DrawerFooter>
            <Button
              disabled={
                updateMutation.isPending || contributionMutation.isPending
              }
              onPress={drawer === 'edit' ? saveEdit : saveContribution}
            >
              <Text style={styles.buttonText}>
                {updateMutation.isPending || contributionMutation.isPending
                  ? 'Guardando...'
                  : 'Guardar'}
              </Text>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  card: { gap: 14, padding: 20 },
  statsCard: { padding: 18 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statLabel: { color: '#94A3B8', fontSize: 11 },
  statValue: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  section: { color: '#0F172A', fontSize: 17, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  delete: { color: '#B91C1C', fontSize: 13 },
  memberRow: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  memberMeta: { color: '#94A3B8', fontSize: 12 },
  timeline: { gap: 10, paddingTop: 8 },
  timelineItem: {
    width: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    backgroundColor: '#FAFAFA',
    padding: 12,
    gap: 6,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  timelineDotActive: { backgroundColor: '#DE034D' },
  timelineLabel: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
});
