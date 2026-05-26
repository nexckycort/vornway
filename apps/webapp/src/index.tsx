import '#/lib/pwa-install-global';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppUpdateBanner } from './components/app-update-banner';
import { FullscreenLoader } from './components/fullscreen-loader';
import { NetworkOfflineBanner } from './components/network-offline-banner';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/ui/theme-provider';
import {
  type AuthContextProps,
  AuthProvider,
} from './contexts/auth/auth-context';
import { useAuth } from './contexts/auth/use-auth';
import { getCurrentLocale } from './lib/i18n';
import { initOfflineSync } from './lib/offline-sync';
import { registerPushServiceWorker } from './lib/push-notifications';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: undefined as unknown as {
    auth: AuthContextProps;
  },
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
    void registerPushServiceWorker();
    initOfflineSync();
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = getCurrentLocale();
  }, []);

  if (auth.loading) return <FullscreenLoader />;

  return <RouterProvider router={router} context={{ auth }} />;
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <App />
            <NetworkOfflineBanner />
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
