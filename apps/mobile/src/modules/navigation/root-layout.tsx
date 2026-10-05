import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import {
  DarkTheme,
  DefaultTheme,
  Redirect,
  Stack,
  ThemeProvider,
  usePathname,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/ui/animated-splash';
import { authClient } from '@/lib/auth-client';
import { LocaleProvider } from '@/lib/i18n';
import { syncPendingExpenses } from '@/lib/offline-expense-queue';
import { syncPendingGroups } from '@/lib/offline-group-queue';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }

    void Promise.allSettled([syncPendingGroups(), syncPendingExpenses()]);
    const subscription = Network.addNetworkStateListener((state) => {
      if (!state.isConnected || state.isInternetReachable === false) return;
      void Promise.allSettled([syncPendingGroups(), syncPendingExpenses()]);
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <ThemeProvider
            value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
          >
            <AnimatedSplashOverlay />
            <AuthGate />
          </ThemeProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function AuthGate() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const isPublicRoute = pathname === '/';

  if (!isPending && !session && !isPublicRoute) {
    return (
      <Redirect href={{ pathname: '/', params: { redirect: pathname } }} />
    );
  }

  if (!isPending && session && isPublicRoute) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
