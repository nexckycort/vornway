import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Member = {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
  role?: string;
  userId?: string | null;
  isCurrentUser?: boolean;
  expenseCount?: number;
  user?: { name?: string | null } | null;
};
type SearchUser = {
  id: string;
  name: string;
  email?: string;
  username?: string | null;
  isAlreadyMember?: boolean;
  isCurrentUser?: boolean;
};

export default function GroupParticipantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);
  const membersQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el espacio');
      return response.json();
    },
  });
  const usersQuery = useQuery({
    queryKey: ['group-member-search', id, debouncedSearch],
    enabled: debouncedSearch.length > 1,
    queryFn: async () => {
      const response = await groupsClient[':id'].members.search.$get({
        param: { id: id ?? '' },
        query: { query: debouncedSearch },
      });
      if (!response.ok) throw new Error('No se pudo buscar usuarios');
      return response.json() as Promise<{ data: SearchUser[] }>;
    },
  });
  const addMutation = useMutation({
    mutationFn: async (participant: {
      name: string;
      linkedUserId?: string;
    }) => {
      const response = await groupsClient[':id'].members.$post({
        param: { id: id ?? '' },
        json: participant,
      });
      if (!response.ok) throw new Error('No se pudo agregar');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
    },
  });
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await groupsClient[':id'].members[':memberId'].$delete({
        param: { id: id ?? '', memberId },
      });
      if (!response.ok) throw new Error('No se pudo eliminar');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
    },
  });
  const unlinkMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await groupsClient[':id'].members[':memberId'][
        'account-link'
      ].$delete({ param: { id: id ?? '', memberId } });
      if (!response.ok) throw new Error('No se pudo desvincular');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
    },
  });
  const transferMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await groupsClient[':id'].owner.$patch({
        param: { id: id ?? '' },
        json: { memberId },
      });
      if (!response.ok) throw new Error('No se pudo transferir la propiedad');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
    },
  });
  const members =
    membersQuery.data && 'members' in membersQuery.data
      ? (membersQuery.data.members as Member[])
      : [];
  const inviteCode =
    membersQuery.data && 'inviteCode' in membersQuery.data
      ? membersQuery.data.inviteCode
      : null;
  const isOwner =
    membersQuery.data && 'isOwner' in membersQuery.data
      ? Boolean(membersQuery.data.isOwner)
      : false;
  const ownerId =
    membersQuery.data && 'ownerId' in membersQuery.data
      ? membersQuery.data.ownerId
      : undefined;
  const currentMemberId =
    membersQuery.data && 'myMembership' in membersQuery.data
      ? membersQuery.data.myMembership?.id
      : undefined;
  function addManual() {
    if (!name.trim() || addMutation.isPending) return;
    addMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName('');
          setSearch('');
        },
        onError: () => Alert.alert('No se pudo agregar', 'Intenta nuevamente.'),
      },
    );
  }
  return (
    <Screen>
      <ScreenHeader
        title="Participantes"
        onBack={() => router.replace(`/groups/${id}` as never)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {membersQuery.isLoading ? <Spinner color="#DE034D" /> : null}
        {membersQuery.isError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.remove}>No se pudo cargar la lista.</Text>
            <Button
              variant="outline"
              onPress={() => void membersQuery.refetch()}
            >
              <Text style={styles.outlineText}>Reintentar</Text>
            </Button>
          </Card>
        ) : null}
        {inviteCode ? (
          <Card style={styles.inviteCard}>
            <Text style={styles.label}>Enlace de invitación</Text>
            <Text selectable style={styles.inviteText}>
              https://join.vornway.com/{inviteCode}
            </Text>
            <Button
              variant="outline"
              onPress={() =>
                void Share.share({
                  message: `Únete a este espacio de Vornway: https://join.vornway.com/${inviteCode}`,
                })
              }
            >
              <Text style={styles.outlineText}>Compartir invitación</Text>
            </Button>
          </Card>
        ) : null}
        <Card style={styles.form}>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Nombre del participante"
          />
          <Button onPress={addManual}>
            <Text style={styles.buttonText}>Agregar participante</Text>
          </Button>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar usuario para vincular"
          />
          {usersQuery.data?.data?.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              disabled={addMutation.isPending || user.isAlreadyMember}
              onPress={() =>
                addMutation.mutate(
                  { name: user.name, linkedUserId: user.id },
                  {
                    onSuccess: () => {
                      setName('');
                      setSearch('');
                    },
                    onError: () =>
                      Alert.alert('No se pudo agregar', 'Intenta nuevamente.'),
                  },
                )
              }
            >
              <Text style={styles.outlineText}>
                {user.name}
                {user.username ? ` · @${user.username}` : ''}
                {user.isAlreadyMember ? ' · Ya está en el espacio' : ''}
                {user.isCurrentUser ? ' · Tú' : ''}
              </Text>
            </Button>
          ))}
          {usersQuery.isError ? (
            <Button variant="ghost" onPress={() => void usersQuery.refetch()}>
              <Text style={styles.copy}>No se pudo buscar. Reintentar</Text>
            </Button>
          ) : null}
          {debouncedSearch &&
          !usersQuery.isFetching &&
          !usersQuery.isError &&
          usersQuery.data?.data.length === 0 ? (
            <Text style={styles.copy}>No se encontraron usuarios</Text>
          ) : null}
        </Card>
        {members.map((member) => (
          <Card key={member.id} style={styles.row}>
            {member.image ? (
              <Image source={{ uri: member.image }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarFallback}>
                {initials(member.user?.name || member.name)}
              </Text>
            )}
            <Card style={styles.memberIdentity}>
              <Text style={styles.name}>
                {member.user?.name || member.name}
                {member.userId === ownerId ? ' · Propietario' : ''}
                {member.isCurrentUser || member.id === currentMemberId
                  ? ' · Tú'
                  : ''}
              </Text>
              <Text style={styles.copy}>
                {member.email ||
                  (member.userId ? 'Cuenta vinculada' : 'Sin cuenta vinculada')}
              </Text>
            </Card>
            {isOwner &&
            member.id !== currentMemberId &&
            member.role !== 'admin' &&
            member.userId ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={unlinkMutation.isPending}
                onPress={() =>
                  Alert.alert(
                    'Desvincular cuenta',
                    `¿Quieres desvincular a ${member.name}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Desvincular',
                        style: 'destructive',
                        onPress: () => unlinkMutation.mutate(member.id),
                      },
                    ],
                  )
                }
              >
                <Text style={styles.outlineText}>Desvincular</Text>
              </Button>
            ) : null}
            {isOwner &&
            member.id !== currentMemberId &&
            member.role !== 'admin' &&
            member.userId ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={transferMutation.isPending}
                onPress={() =>
                  Alert.alert(
                    'Transferir propiedad',
                    `¿Quieres transferir la propiedad a ${member.name}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Transferir',
                        onPress: () => transferMutation.mutate(member.id),
                      },
                    ],
                  )
                }
              >
                <Text style={styles.outlineText}>Transferir</Text>
              </Button>
            ) : null}
            {isOwner && member.id !== currentMemberId ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={
                  removeMutation.isPending || (member.expenseCount ?? 0) > 0
                }
                onPress={() =>
                  Alert.alert(
                    'Eliminar participante',
                    `¿Quieres eliminar a ${member.name}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: () => removeMutation.mutate(member.id),
                      },
                    ],
                  )
                }
              >
                <Text style={styles.remove}>Eliminar</Text>
              </Button>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 152 },
  form: { gap: 12, padding: 16 },
  inviteCard: { gap: 10, padding: 16 },
  label: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  inviteText: { color: '#64748B', fontSize: 12 },
  memberIdentity: {
    flex: 1,
    gap: 3,
    padding: 0,
    backgroundColor: 'transparent',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
    borderRadius: 20,
    color: '#DE034D',
    display: 'flex',
    fontSize: 16,
    fontWeight: '700',
    height: 40,
    justifyContent: 'center',
    textAlign: 'center',
    width: 40,
  },
  copy: { color: '#64748B', fontSize: 12 },
  errorCard: { gap: 10, padding: 16 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  name: { color: '#0F172A', flex: 1, fontSize: 15, fontWeight: '600' },
  remove: { color: '#B91C1C', fontSize: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}
