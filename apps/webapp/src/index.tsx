import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FullscreenLoader } from './components/fullscreen-loader';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/ui/theme-provider';
import {
  type AuthContextProps,
  AuthProvider,
} from './contexts/auth/auth-context';
import { useAuth } from './contexts/auth/use-auth';

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

// Desactivar selección con doble click
document.addEventListener('selectstart', (e) => {
  e.preventDefault();
  return false;
});
