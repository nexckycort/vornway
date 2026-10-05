import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';

type Group = {
  id: string;
  name: string;
  imageUrl?: string | null;
  updatedAt?: string;
  participantCount?: number;
  members?: Array<{
    id: string;
    name: string;
    userId?: string | null;
    image?: string | null;
  }>;
};

export default function ExpenseEntryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const groupsQuery = useQuery({
    queryKey: ['expense-entry-groups'],
    queryFn: async () => {
      const response = await groupsClient.index.$get({
        query: { limit: '50', filter: 'all' },
      });
      if (!response.ok) throw new Error('groups_load_failed');
      return (await response.json()) as unknown as { data: Group[] };
    },
  });
  const groups = groupsQuery.data?.data ?? [];
  const friends = useMemo(() => {
    const result = new Map<
      string,
      { id: string; name: string; image?: string | null; groups: number }
    >();
    for (const group of groups) {
      for (const member of group.members ?? []) {
        const key = member.userId
          ? `user:${member.userId}`
          : `manual:${member.name.trim().toLowerCase()}`;
        const previous = result.get(key);
        result.set(key, {
          id: previous?.id ?? member.id,
          name: previous?.name ?? member.name,
          image: previous?.image ?? member.image,
          groups: (previous?.groups ?? 0) + 1,
        });
      }
    }
    return [...result.values()];
  }, [groups]);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(normalizedSearch),
  );
  const visibleFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(normalizedSearch),
  );

  function toggleFriend(id: string) {
    setSelectedFriendIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function continueWithFriends() {
    const selected = friends.filter((friend) =>
      selectedFriendIds.includes(friend.id),
    );
    router.push({
      pathname: '/expenses/quick-split',
      params: {
        participants: selected.map((friend) => friend.name).join(', '),
      },
    } as never);
  }

  return (
    <Screen>
      <ScreenHeader title="Nuevo gasto" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>¿Con quién compartiste?</Text>
        <Text style={styles.description}>
          Elige un espacio existente o selecciona amigos para crear un gasto
          rápido.
        </Text>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar espacios o amigos"
          style={styles.search}
        />
        <Text style={styles.sectionLabel}>ESPACIOS</Text>
        {groupsQuery.isLoading ? <ActivityIndicator color="#DE034D" /> : null}
        {visibleGroups.map((group) => (
          <Button
            key={group.id}
            variant="outline"
            style={styles.groupCard}
            onPress={() =>
              router.push(`/groups/${group.id}/add-expense` as never)
            }
          >
            <View style={styles.groupCopy}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.meta}>
                {group.participantCount ?? group.members?.length ?? 0}{' '}
                participantes
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Button>
        ))}
        {!groupsQuery.isLoading && visibleGroups.length === 0 ? (
          <Text style={styles.empty}>No hay espacios que coincidan.</Text>
        ) : null}
        <Text style={styles.sectionLabel}>AMIGOS</Text>
        {visibleFriends.map((friend) => {
          const selected = selectedFriendIds.includes(friend.id);
          return (
            <Button
              key={friend.id}
              variant="outline"
              style={styles.friendRow}
              onPress={() => toggleFriend(friend.id)}
            >
              <View style={styles.friendCopy}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.meta}>
                  {friend.groups} espacios compartidos
                </Text>
              </View>
              <Checkbox
                value={selected}
                onValueChange={() => toggleFriend(friend.id)}
              />
            </Button>
          );
        })}
        {!groupsQuery.isLoading && visibleFriends.length === 0 ? (
          <Text style={styles.empty}>
            Aún no tienes amigos en espacios compartidos.
          </Text>
        ) : null}
        <Button
          disabled={selectedFriendIds.length === 0}
          onPress={continueWithFriends}
        >
          <Text style={styles.primaryText}>Continuar</Text>
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 152 },
  heading: { color: '#0F172A', fontSize: 24, fontWeight: '600' },
  description: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  search: { backgroundColor: '#FFFFFF', borderRadius: 24, height: 44 },
  sectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 10,
  },
  groupCard: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    padding: 14,
  },
  groupCopy: { flex: 1, gap: 4 },
  groupName: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  friendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    padding: 14,
  },
  friendCopy: { flex: 1, gap: 4 },
  friendName: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  meta: { color: '#64748B', fontSize: 12 },
  chevron: { color: '#DE034D', fontSize: 26 },
  empty: { color: '#64748B', fontSize: 13, paddingVertical: 8 },
  primaryText: { color: '#FFFFFF', fontWeight: '600' },
});
