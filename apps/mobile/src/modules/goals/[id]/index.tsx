import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

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

type Member = { id: string; name: string };
type Contribution = {
  id: string;
  member?: { name: string };
  amount: number;
  currency: string;
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
  members?: Member[];
  group?: { id: string };
  contributions?: Contribution[];
  myMembership?: { role: string } | null;
};

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const userSearchQuery = useQuery({
    queryKey: ['goal-member-search', participantSearch.trim()],
    enabled: participantSearch.trim().length > 1,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: participantSearch.trim() },
      });
      if (!response.ok) throw new Error('member_search_failed');
      return response.json() as Promise<{
        data: Array<{ id: string; name: string; username?: string | null }>;
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
      await queryClient.invalidateQueries({ queryKey: ['goal-detail', id] });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goal-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['goals-list'] });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goal-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['goals-list'] });
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
      await queryClient.invalidateQueries({ queryKey: ['goal-detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['goals-list'] });
    },
  });
  const goal = goalQuery.data;
  const isAdmin = goal?.myMembership?.role === 'admin';
  const progress = goal
    ? (goal.progress ?? goal.savedAmount / goal.targetAmount)
    : 0;
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
        onBack={() => router.back()}
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
              <Progress value={progress * 100} />
              <Text style={styles.copy}>
                {goal.savedAmount} de {goal.targetAmount} {goal.currency}
              </Text>
              <Button onPress={openEdit}>
                <Text style={styles.buttonText}>Editar meta</Text>
              </Button>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.section}>Participantes</Text>
              <Input
                value={participantSearch}
                onChangeText={setParticipantSearch}
                placeholder="Buscar usuario o escribir nombre"
              />
              {userSearchQuery.data?.data?.map((candidate) => (
                <Button
                  key={candidate.id}
                  variant="outline"
                  disabled={addMemberMutation.isPending}
                  onPress={() =>
                    addMemberMutation.mutate({
                      name: candidate.name,
                      linkedUserId: candidate.id,
                    })
                  }
                >
                  <Text style={styles.outlineText}>
                    {candidate.name}
                    {candidate.username ? ` · @${candidate.username}` : ''}
                  </Text>
                </Button>
              ))}
              {goal.members?.map((member) => (
                <Text key={member.id} style={styles.copy}>
                  {member.name}
                </Text>
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
            <Card style={styles.card}>
              <Text style={styles.section}>Contribuciones</Text>
              {goal.contributions?.map((item) => (
                <React.Fragment key={item.id}>
                  <Text style={styles.copy}>
                    {item.member?.name ?? 'Participante'} · {item.amount}{' '}
                    {goal.currency}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteContributionMutation.isPending}
                    onPress={() => deleteContributionMutation.mutate(item.id)}
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
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  section: { color: '#0F172A', fontSize: 17, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  delete: { color: '#B91C1C', fontSize: 13 },
});
