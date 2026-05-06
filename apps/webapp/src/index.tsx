import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { Toaster } from './components/ui/sonner';
import { Spinner } from './components/ui/spinner';
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

  if (auth.loading) return <Spinner />;

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
