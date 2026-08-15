import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminClient } from '@/api/admin';
import { authClient } from '@/lib/auth-client';

export default function StatsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const email = (
    session as { user?: { email?: string | null } } | null
  )?.user?.email
    ?.trim()
    .toLowerCase();
  const allowed = email === 'junior110120@gmail.com';
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalGroups: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    void adminClient.stats.$get().then(async (response) => {
      if (response.ok)
        setStats(
          (await response.json()) as {
            totalUsers: number;
            totalGroups: number;
          },
        );
      setLoading(false);
    });
  }, [allowed]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Estadísticas</Text>
          <View style={{ width: 24 }} />
        </View>
        {!allowed ? (
          <View style={styles.card}>
            <Text style={styles.title}>Sin acceso</Text>
            <Text style={styles.copy}>
              No tienes permisos para ver estas estadísticas.
            </Text>
            <Pressable style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Volver al perfil</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.copy}>Resumen general de Vornway.</Text>
              {loading ? (
                <ActivityIndicator color="#DE034D" />
              ) : (
                <View style={styles.grid}>
                  <Stat
                    label="Usuarios"
                    value={String(stats?.totalUsers ?? 0)}
                  />
                  <Stat
                    label="Espacios"
                    value={String(stats?.totalGroups ?? 0)}
                  />
                </View>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.title}>Feedback</Text>
              <Text style={styles.copy}>
                Administra los reportes y solicitudes de los usuarios.
              </Text>
              <Pressable
                style={styles.button}
                onPress={() => router.push('/profile/stats/feedback' as never)}
              >
                <Text style={styles.buttonText}>Abrir bandeja</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16, paddingBottom: 152, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: '#202124', fontSize: 34 },
  title: { color: '#0F172A', fontSize: 24, fontWeight: '600' },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 28,
    padding: 18,
    backgroundColor: '#FFFFFF',
  },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, borderRadius: 20, backgroundColor: '#F8FAFC', padding: 14 },
  statLabel: { color: '#94A3B8', fontSize: 12 },
  statValue: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 8,
  },
  button: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DE034D',
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
