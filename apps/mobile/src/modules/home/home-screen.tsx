import { useMinimizeOnScroll } from 'expo-glass-tabs';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authClient } from '@/lib/auth-client';

import { ActionCard, HomeSection } from './components/home-card';
import { DebtCard, ExpenseCard, GoalCard } from './components/summary-cards';
import { TripCard } from './components/trip-card';
import { useHomeData } from './hooks/use-home-data';

export default function HomeScreen() {
  const router = useRouter();
  const { data, error, isLoading, reload } = useHomeData();
  const onScroll = useMinimizeOnScroll();
  const { data: session } = authClient.useSession();
  const userName = useMemo(
    () =>
      (
        session as { user?: { name?: string | null } } | null
      )?.user?.name?.trim() || 'viajero',
    [session],
  );
  const hasGroups = (data?.trips.length ?? 0) > 0;

  if (isLoading && !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#DE034D" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void reload()}
            tintColor="#DE034D"
          />
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hola, <Text style={styles.name}>{userName}</Text>
            </Text>
            <Text style={styles.welcome}>Bienvenido a Vornway</Text>
          </View>
          <Pressable
            accessibilityLabel="Notificaciones"
            onPress={() => router.push('/explore')}
            style={styles.bell}
          >
            <Text style={styles.bellText}>♧</Text>
            {(data?.unreadNotifications ?? 0) > 0 ? (
              <View style={styles.dot} />
            ) : null}
          </Pressable>
        </View>

        <View style={styles.actions}>
          <ActionCard
            icon="＋"
            title="Crear espacio"
            onPress={() => router.push('/explore')}
          />
          <ActionCard
            icon="↗"
            title="Agregar gasto"
            primary
            onPress={() => router.push('/explore')}
          />
        </View>

        {error ? (
          <Pressable onPress={() => void reload()} style={styles.error}>
            <Text style={styles.errorText}>{error}. Toca para reintentar.</Text>
          </Pressable>
        ) : null}

        {!hasGroups ? (
          <EmptyState onPress={() => router.push('/explore')} />
        ) : (
          <>
            {data && data.expenses.length > 0 ? (
              <HomeSection title="Gastos recientes">
                <View style={styles.stack}>
                  {data.expenses.map((item) => (
                    <ExpenseCard key={item.id} item={item} />
                  ))}
                </View>
              </HomeSection>
            ) : null}
            <HomeSection title="Grupos recientes">
              <View style={styles.stack}>
                {data?.trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </View>
            </HomeSection>
            {data && data.goals.length > 0 ? (
              <HomeSection title="Metas de ahorro">
                <View style={styles.stack}>
                  {data.goals.map((goal) => (
                    <GoalCard key={goal.id} item={goal} />
                  ))}
                </View>
              </HomeSection>
            ) : null}
            {data && data.debts.length > 0 ? (
              <HomeSection title="Deudas recientes">
                <View style={styles.stack}>
                  {data.debts.map((debt) => (
                    <DebtCard key={debt.id} item={debt} />
                  ))}
                </View>
              </HomeSection>
            ) : null}
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.logoStack}>
        <View style={styles.logoPink} />
        <View style={styles.logoWhite}>
          <Image
            source={require('@/assets/images/home/logo.webp')}
            style={styles.logo}
            contentFit="cover"
          />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Todo tu espacio empieza aquí</Text>
      <Text style={styles.emptyText}>
        Crea tu primer espacio, organiza tus gastos y define tus metas de
        ahorro. Vornway te acompaña en cada paso.
      </Text>
      <Pressable onPress={onPress} style={styles.createButton}>
        <Text style={styles.createIcon}>＋</Text>
        <Text style={styles.createText}>Crear espacio</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  content: {
    paddingHorizontal: 16,
    // Keep the last card above the floating glass tab bar.
    paddingBottom: 152,
    backgroundColor: '#FAFAFA',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { color: '#202124', fontSize: 18, lineHeight: 27 },
  name: { color: '#DE034D', fontWeight: '700' },
  welcome: { color: '#626262', fontSize: 12 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bellText: {
    color: '#202124',
    fontSize: 23,
    transform: [{ rotate: '180deg' }],
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DE034D',
  },
  actions: { flexDirection: 'row', gap: 16, marginTop: 28 },
  stack: { gap: 14 },
  error: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: '#fff0f3',
    padding: 12,
  },
  errorText: { color: '#a00036', fontSize: 13 },
  empty: {
    flex: 1,
    minHeight: 410,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  logoStack: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPink: {
    position: 'absolute',
    right: 7,
    top: 15,
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#DE034D',
  },
  logoWhite: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  logo: { width: 64, height: 64, borderRadius: 18 },
  emptyTitle: {
    marginTop: 18,
    color: '#202124',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    maxWidth: 320,
    color: '#5e5e5e',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  createButton: {
    width: '100%',
    height: 48,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createIcon: { color: '#202124', fontSize: 21 },
  createText: { color: '#202124', fontSize: 15, fontWeight: '500' },
});
