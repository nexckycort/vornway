import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { useExpenseEntryData } from '../hooks/use-expense-entry-data';

export default function ExpenseEntryScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: 'friends' | 'home' }>();
  const [search, setSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const { groupsQuery, spaces, recentFriends } = useExpenseEntryData();
  const normalizedSearch = search.trim().toLowerCase();
  const visibleGroups = spaces.filter((group) =>
    group.name.toLowerCase().includes(normalizedSearch),
  );
  const visibleFriends = recentFriends.filter((friend) =>
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
    const selected = recentFriends.filter((friend) =>
      selectedFriendIds.includes(friend.id),
    );
    router.push({
      pathname: '/expenses/quick-split',
      params: {
        from: from ?? 'home',
        participants: selected.map((friend) => friend.name).join(', '),
        participantData: JSON.stringify(
          selected.map((friend) => ({
            name: friend.name,
            ...(friend.userId ? { userId: friend.userId } : {}),
          })),
        ),
      },
    } as never);
  }

  return (
    <Screen>
      <ScreenHeader
        title="Nuevo gasto"
        onBack={() =>
          router.replace(
            (from === 'friends' ? '/expenses/friends' : '/(tabs)') as never,
          )
        }
      />
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
            {group.imageUrl ? (
              <Image source={{ uri: group.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials(group.name)}</Text>
              </View>
            )}
            <View style={styles.groupCopy}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.meta}>
                {group.participantCount <= 1
                  ? 'Solo tú'
                  : `${group.participantCount} participantes`}
              </Text>
            </View>
            <Text style={styles.tag}>
              {group.participantCount <= 1 ? 'Personal' : 'Compartido'}
            </Text>
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
              {friend.image ? (
                <Image source={{ uri: friend.image }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initials(friend.name)}</Text>
                </View>
              )}
              <View style={styles.friendCopy}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.meta}>
                  {friend.sharedGroupCount} espacios compartidos
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
  avatar: { borderRadius: 8, height: 44, width: 44 },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#FFE2E8',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { color: '#DE034D', fontSize: 16, fontWeight: '700' },
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
  tag: {
    backgroundColor: '#FFF0F2',
    borderColor: '#FFE2E7',
    borderRadius: 999,
    borderWidth: 1,
    color: '#DE034D',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chevron: { color: '#DE034D', fontSize: 26 },
  empty: { color: '#64748B', fontSize: 13, paddingVertical: 8 },
  primaryText: { color: '#FFFFFF', fontWeight: '600' },
});

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
