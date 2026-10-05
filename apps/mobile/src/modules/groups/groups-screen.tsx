import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Group = {
  id: string;
  name: string;
  description?: string | null;
  type?: string;
  members?: Array<{ name: string }>;
  participantBalances?: Array<{ label: string }>;
  hasExpenses?: boolean;
};
type GroupPage = { data: Group[]; pagination?: { nextCursor?: string | null } };

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const response = await groupsClient.index.$get({
      query: {
        limit: '50',
        filter: 'all',
        ...(search.trim() ? { search: search.trim() } : {}),
      },
    });
    if (response.ok) setGroups(((await response.json()) as GroupPage).data);
    setLoading(false);
    setRefreshing(false);
  }, [search]);
  useEffect(() => {
    void load();
  }, [load]);
  const visibleGroups = useMemo(() => groups, [groups]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <View style={styles.top}>
          <Text style={styles.heading}>Espacios</Text>
          <Button onPress={() => router.push('/groups/new' as never)}>
            <Text style={styles.buttonText}>＋ Crear</Text>
          </Button>
        </View>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar espacios"
          style={styles.search}
        />
        {loading ? (
          <Spinner color="#DE034D" />
        ) : visibleGroups.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>Aún no tienes espacios</Text>
            <Text style={styles.copy}>
              Crea un espacio para organizar un viaje con tu grupo.
            </Text>
            <Button onPress={() => router.push('/groups/new' as never)}>
              <Text style={styles.buttonText}>Crear espacio</Text>
            </Button>
          </Card>
        ) : (
          visibleGroups.map((group) => (
            <Card key={group.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copyWrap}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {group.name}
                  </Text>
                  <Text style={styles.copy}>
                    {group.description ||
                      `${group.members?.length ?? 0} participantes`}
                  </Text>
                </View>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => router.push(`/groups/${group.id}` as never)}
                >
                  <Text style={styles.link}>Abrir</Text>
                </Button>
              </View>
              {group.participantBalances?.slice(0, 2).map((balance) => (
                <Text key={balance.label} style={styles.copy}>
                  {balance.label}
                </Text>
              ))}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heading: { color: '#0F172A', fontSize: 30, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  search: { backgroundColor: '#FFFFFF', borderRadius: 24, height: 44 },
  card: { gap: 8, padding: 16 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  copyWrap: { flex: 1, gap: 4 },
  cardTitle: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  link: { color: '#DE034D', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 12, padding: 24 },
  emptyTitle: { color: '#0F172A', fontSize: 18, fontWeight: '600' },
});
