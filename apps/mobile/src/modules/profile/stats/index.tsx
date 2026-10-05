import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminClient } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';

export default function StatsScreen() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const email = (
    session as { user?: { email?: string | null } } | null
  )?.user?.email
    ?.trim()
    .toLowerCase();
  const allowed = email === 'junior110120@gmail.com';
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    enabled: allowed,
    queryFn: async () => {
      const response = await adminClient.stats.$get();
      if (!response.ok) throw new Error('stats_load_failed');
      return (await response.json()) as {
        totalUsers: number;
        totalGroups: number;
      };
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.replace('/profile' as never)}
          >
            <Text style={styles.back}>‹</Text>
          </Button>
          <Text style={styles.title}>Estadísticas</Text>
          <View style={{ width: 24 }} />
        </View>
        {sessionPending ? (
          <Card style={styles.card}>
            <Spinner color="#DE034D" />
            <Text style={styles.copy}>Cargando sesión...</Text>
          </Card>
        ) : !allowed ? (
          <Card style={styles.card}>
            <Text style={styles.title}>Sin acceso</Text>
            <Text style={styles.copy}>
              No tienes permisos para ver estas estadísticas.
            </Text>
            <Button
              style={styles.button}
              onPress={() => router.replace('/profile' as never)}
            >
              <Text style={styles.buttonText}>Volver al perfil</Text>
            </Button>
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={styles.copy}>Resumen general de Vornway.</Text>
              {statsQuery.isLoading ? (
                <Spinner color="#DE034D" />
              ) : statsQuery.isError ? (
                <View style={styles.errorState}>
                  <Text style={styles.copy}>
                    No pudimos cargar las estadísticas.
                  </Text>
                  <Button onPress={() => void statsQuery.refetch()}>
                    <Text style={styles.buttonText}>Reintentar</Text>
                  </Button>
                </View>
              ) : (
                <View style={styles.grid}>
                  <Stat
                    label="Usuarios"
                    value={formatNumber(statsQuery.data?.totalUsers ?? 0)}
                  />
                  <Stat
                    label="Espacios"
                    value={formatNumber(statsQuery.data?.totalGroups ?? 0)}
                  />
                </View>
              )}
            </Card>
            <Card style={styles.card}>
              <Text style={styles.title}>Feedback</Text>
              <Text style={styles.copy}>
                Administra los reportes y solicitudes de los usuarios.
              </Text>
              <Button
                style={styles.button}
                onPress={() => router.push('/profile/stats/feedback' as never)}
              >
                <Text style={styles.buttonText}>Abrir bandeja</Text>
              </Button>
            </Card>
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
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
  errorState: { gap: 10 },
});
