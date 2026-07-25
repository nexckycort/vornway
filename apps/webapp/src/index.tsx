import '#/lib/pwa-install-global';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppUpdateBanner } from './components/app-update-banner';
import { FullscreenLoader } from './components/fullscreen-loader';
import {
  NativeAppEnhancements,
  OfflineSyncStatus,
} from './components/native-app-enhancements';
import { NetworkOfflineBanner } from './components/network-offline-banner';
import { PwaInstallPrompt } from './components/pwa-install-prompt';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/ui/theme-provider';
import {
  type AuthContextProps,
  AuthProvider,
} from './contexts/auth/auth-context';
import { useAuth } from './contexts/auth/use-auth';
import { installBrowserBackNavigation } from './lib/browser-back-navigation';
import { getCurrentLocale } from './lib/i18n';
import { initOfflineSync } from './lib/offline-sync';
import { registerPushServiceWorker } from './lib/push-notifications';
import {
  createFirstVisitTracker,
  scheduleRoutePreloads,
} from './lib/route-preloading';
import {
  installServiceWorkerNavigation,
  resolveNotificationUrl,
  syncServiceWorkerLocale,
} from './lib/service-worker-messages';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

if (typeof document !== 'undefined') {
  const locale = getCurrentLocale();
  document.documentElement.lang = locale;
  document
    .querySelector<HTMLLinkElement>('link[rel="manifest"]')
    ?.setAttribute(
      'href',
      locale === 'en' ? '/manifest.en.json' : '/manifest.json',
    );
}

const browserBackNavigation = installBrowserBackNavigation();

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: undefined as unknown as {
    auth: AuthContextProps;
  },
});

const firstVisitTracker = createFirstVisitTracker(window.location.pathname);

router.subscribe('onBeforeNavigate', ({ toLocation }) => {
  firstVisitTracker.start(toLocation.pathname);
});

router.subscribe('onRendered', ({ toLocation }) => {
  firstVisitTracker.finish(toLocation.pathname);
});

browserBackNavigation.configure({
  getGroupReturnTo: () => {
    const state = router.state.resolvedLocation?.state as
      | {
          returnTo?: string;
        }
      | undefined;
    return state?.returnTo?.startsWith('/') ? state.returnTo : undefined;
  },
  navigate: (to) => {
    void router.navigate({ to, replace: true } as never);
  },
});

router.subscribe('onResolved', ({ toLocation }) => {
  browserBackNavigation.setCurrentPathname(toLocation.pathname);
  resolveNotificationUrl(toLocation.pathname);
});

installServiceWorkerNavigation((path) => {
  void router.navigate({ to: path as never });
});

const queryClient = new QueryClient();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const auth = useAuth();

  React.useEffect(() => {
    if (!auth.isAuthenticated) return;

    return scheduleRoutePreloads([
      () => router.preloadRoute({ to: '/expenses/friends' }),
      () => router.preloadRoute({ to: '/groups' }),
      () => router.preloadRoute({ to: '/goals' }),
      () => router.preloadRoute({ to: '/profile' }),
      () =>
        router.preloadRoute({
          to: '/expenses/new',
          search: { from: 'home' },
        }),
      () =>
        router.preloadRoute({
          to: '/expenses/quick-split',
          search: { friendIds: [], from: 'home' },
        }),
      () =>
        router.preloadRoute({
          to: '/groups/new',
          search: {
            description: '',
            draftId: '',
            from: 'home',
            name: '',
            type: '',
          },
        }),
      () =>
        router.preloadRoute({
          to: '/goals/new',
          search: { from: 'home' },
        }),
      () => router.preloadRoute({ to: '/notifications' }),
    ]);
  }, [auth.isAuthenticated]);

  React.useEffect(() => {
    const scheduleBackgroundSetup = () => {
      void registerPushServiceWorker().then(() => {
        syncServiceWorkerLocale(getCurrentLocale());
      });
      initOfflineSync();
    };

    if ('requestIdleCallback' in window) {
      const idleCallbackId = window.requestIdleCallback(
        scheduleBackgroundSetup,
        {
          timeout: 2000,
        },
      );

      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = globalThis.setTimeout(scheduleBackgroundSetup, 0);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  if (auth.loading && !auth.user) return <FullscreenLoader />;

  return <RouterProvider router={router} context={{ auth }} />;
}

async function cleanupDevelopmentServiceWorker() {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  );

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  void cleanupDevelopmentServiceWorker();

  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <App />
            <NetworkOfflineBanner />
            <OfflineSyncStatus />
            <NativeAppEnhancements />
            <PwaInstallPrompt />
            <AppUpdateBanner />
            <Toaster richColors />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}

// Desactivar menú contextual del click derecho para comportamiento móvil
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});

// Desactivar arrastrar y soltar para comportamiento móvil
document.addEventListener('dragstart', (e) => {
  e.preventDefault();
  return false;
});
