import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { usersClient } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';
import { enqueueGroup, syncPendingGroups } from '@/lib/offline-group-queue';
import { useUsernameRequirement } from '../../../username/use-username-requirement';
import {
  clearGroupDraft,
  loadGroupDraft,
  saveGroupDraft,
} from '../group-create-draft';

type Participant = {
  name: string;
  userId?: string;
  username?: string | null;
  email?: string | null;
};

export default function GroupCreateParticipantsScreen() {
  const { name, type, description, draftId, from } = useLocalSearchParams<{
    name: string;
    type: 'espacio' | 'personal';
    description?: string;
    draftId?: string;
    from?: 'home' | 'groups';
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { ensureUsername, usernameDialog } = useUsernameRequirement();
  const currentUserId = (session as { user?: { id?: string | null } } | null)
    ?.user?.id;
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(!draftId);
  const personalCreationStartedRef = useRef(false);
  const [createdGroup, setCreatedGroup] = useState<{
    id: string;
    name: string;
    inviteCode?: string | null;
    queued?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!draftId) {
      setDraftLoaded(true);
      return;
    }
    void loadGroupDraft(draftId).then((draft) => {
      if (draft?.imageDataUrl) setImageDataUrl(draft.imageDataUrl);
      if (draft?.imageFileName) setImageFileName(draft.imageFileName);
      setDraftLoaded(true);
    });
  }, [draftId]);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedInput(input.trim()), 250);
    return () => clearTimeout(timeout);
  }, [input]);
  const searchQuery = useQuery({
    queryKey: ['group-create-user-search', debouncedInput],
    enabled: debouncedInput.length > 1,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: debouncedInput },
      });
      if (!response.ok) throw new Error('search_failed');
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name?.trim() || !type?.trim()) throw new Error('invalid');
      const payload = {
        name: name.trim(),
        type,
        ...(description?.trim() ? { description: description.trim() } : {}),
        participants,
      } as const;
      const network = await Network.getNetworkStateAsync();
      if (!network.isConnected || network.isInternetReachable === false) {
        const pending = await enqueueGroup(payload);
        return { id: pending.id, name: pending.payload.name, queued: true };
      }
      const response = await groupsClient.index.$post({
        json: {
          ...payload,
          ...(imageDataUrl
            ? {
                image: {
                  dataUrl: imageDataUrl,
                  fileName: imageFileName ?? 'group-image.jpg',
                },
              }
            : {}),
          participants,
        },
      });
      if (!response.ok) throw new Error('create_failed');
      return response.json();
    },
    onSuccess: (group) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      if (draftId) void clearGroupDraft(draftId);
      if ('queued' in group && group.queued) {
        void syncPendingGroups();
        if (type === 'personal') {
          router.replace('/spaces' as never);
          return;
        }
        setCreatedGroup({ ...group, queued: true });
        return;
      }
      if (type === 'personal') {
        router.replace(`/groups/${group.id}` as never);
        return;
      }
      setCreatedGroup(group);
    },
  });
  const createGroup = useCallback(async () => {
    if (!(await ensureUsername())) return false;
    createMutation.mutate(undefined, {
      onError: () => Alert.alert('No se pudo crear', 'Intenta nuevamente.'),
    });
    return true;
  }, [createMutation, ensureUsername]);
  useEffect(() => {
    if (
      type !== 'personal' ||
      !draftLoaded ||
      !name?.trim() ||
      personalCreationStartedRef.current
    ) {
      return;
    }
    personalCreationStartedRef.current = true;
    void createGroup()
      .then((started) => {
        if (!started) personalCreationStartedRef.current = false;
      })
      .catch(() => {
        personalCreationStartedRef.current = false;
      });
  }, [createGroup, draftLoaded, name, type]);
  function addParticipant(participant: Participant) {
    const normalized = participant.name.trim().toLocaleLowerCase('es-CO');
    if (
      !normalized ||
      participants.some(
        (current) =>
          (participant.userId && current.userId === participant.userId) ||
          current.name.trim().toLocaleLowerCase('es-CO') === normalized,
      )
    )
      return;
    setParticipants((current) => [...current, participant]);
    setInput('');
  }
  async function chooseImage() {
    const network = await Network.getNetworkStateAsync();
    if (!network.isConnected || network.isInternetReachable === false) {
      Alert.alert(
        'Imagen no disponible sin conexión',
        'Conéctate a internet para agregar una imagen al espacio.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset?.base64) {
      const nextImage = `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
      setImageDataUrl(nextImage);
      setImageFileName(asset.fileName ?? 'group-image.jpg');
      if (draftId) {
        void saveGroupDraft(draftId, {
          name: name?.trim() ?? '',
          type: type ?? 'espacio',
          description: description?.trim() ?? '',
          imageDataUrl: nextImage,
          imageFileName: asset.fileName ?? 'group-image.jpg',
        });
      }
    }
  }
  if (createdGroup) {
    const inviteLink = createdGroup.inviteCode
      ? `https://join.vornway.com/${createdGroup.inviteCode}`
      : '';
    return (
      <Screen>
        <ScreenHeader
          title="Espacio creado"
          onBack={() =>
            router.replace({
              pathname: '/groups/new',
              params: { draftId, from: from ?? 'groups' },
            } as never)
          }
        />
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.successCard}>
            <Text style={styles.successTitle}>{createdGroup.name}</Text>
            <Text style={styles.copy}>
              {createdGroup.queued
                ? 'El espacio quedó guardado y se sincronizará cuando vuelva la conexión.'
                : 'Comparte este enlace para invitar a los demás participantes.'}
            </Text>
            {inviteLink ? (
              <Card style={styles.linkCard}>
                <Text selectable style={styles.linkText}>
                  {inviteLink}
                </Text>
              </Card>
            ) : null}
            <Button
              variant="outline"
              disabled={!inviteLink}
              onPress={() =>
                void Share.share({
                  title: createdGroup.name,
                  message: `Únete a ${createdGroup.name} en Vornway: ${inviteLink}`,
                  url: inviteLink,
                })
              }
            >
              <Text style={styles.outlineText}>Compartir enlace</Text>
            </Button>
            <Button
              onPress={() =>
                router.replace(
                  createdGroup.queued
                    ? ('/spaces' as never)
                    : (`/groups/${createdGroup.id}` as never),
                )
              }
            >
              <Text style={styles.buttonText}>
                {createdGroup.queued ? 'Volver a espacios' : 'Ir al espacio'}
              </Text>
            </Button>
          </Card>
        </ScrollView>
      </Screen>
    );
  }
  return (
    <Screen>
      <ScreenHeader
        title="Participantes"
        onBack={() =>
          router.replace({
            pathname: '/groups/new',
            params: {
              draftId,
              name,
              type,
              description,
              from: from ?? 'groups',
            },
          } as never)
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>{name || 'Nuevo espacio'}</Text>
          <Text style={styles.copy}>
            Agrega personas manualmente o vincula usuarios de Vornway.
          </Text>
          {imageDataUrl ? (
            <Image
              source={{ uri: imageDataUrl }}
              style={styles.image}
              contentFit="cover"
            />
          ) : null}
          <Button variant="outline" onPress={() => void chooseImage()}>
            <Text style={styles.outlineText}>Agregar imagen del espacio</Text>
          </Button>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Nombre o usuario"
          />
          <Button
            variant="outline"
            disabled={!input.trim()}
            onPress={() => addParticipant({ name: input.trim() })}
          >
            <Text style={styles.outlineText}>Agregar manualmente</Text>
          </Button>
          {searchQuery.data?.data?.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              disabled={user.id === currentUserId}
              onPress={() =>
                user.id === currentUserId
                  ? undefined
                  : addParticipant({
                      name: user.name,
                      userId: user.id,
                      username: user.username,
                      email: user.email,
                    })
              }
            >
              <Text style={styles.outlineText}>
                {user.name}
                {user.username ? ` · @${user.username}` : ''}
                {!user.username && user.email ? ` · ${user.email}` : ''}
                {user.id === currentUserId ? ' · Tú' : ''}
              </Text>
            </Button>
          ))}
          {searchQuery.isError ? (
            <Button variant="ghost" onPress={() => void searchQuery.refetch()}>
              <Text style={styles.copy}>No se pudo buscar. Reintentar</Text>
            </Button>
          ) : null}
          {participants.map((participant) => (
            <Button
              key={participant.userId ?? participant.name}
              variant="ghost"
              onPress={() =>
                setParticipants((current) =>
                  current.filter((item) => item !== participant),
                )
              }
            >
              <Text style={styles.copy}>
                ✓ {participant.name}
                {participant.username
                  ? ` · @${participant.username}`
                  : participant.email
                    ? ` · ${participant.email}`
                    : ''}{' '}
                · Quitar
              </Text>
            </Button>
          ))}
          <Button
            disabled={createMutation.isPending}
            onPress={() => void createGroup()}
          >
            {createMutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crear espacio</Text>
            )}
          </Button>
        </Card>
      </ScrollView>
      {usernameDialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 152 },
  card: { gap: 12, padding: 18 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  image: { borderRadius: 16, height: 120, width: 120 },
  successCard: { gap: 14, padding: 20 },
  successTitle: { color: '#0F172A', fontSize: 24, fontWeight: '600' },
  linkCard: { padding: 12, backgroundColor: '#F8FAFC' },
  linkText: { color: '#334155', fontSize: 13 },
});
