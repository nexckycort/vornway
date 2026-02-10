import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { Toaster } from '@workspace/ui/components/sonner';

import appCss from '@workspace/ui/globals.css?url';
import { clientEnv } from '~/config/env.client';
import { getCurrentUserFn } from '~/server/auth';
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    try {
      const user = await getCurrentUserFn();
      return { user };
    } catch (error) {
      console.error('Error getting current user:', error);
      return { user: null };
    }
  },
  loader: async () => {
    const isDev = clientEnv.APP_ENV === 'dev';
    return { isDev };
  },
  head: ({ loaderData }) => {
    const isDev = loaderData?.isDev;

    const title = isDev ? 'Splitway Dev' : 'Splitway App';
    const favicon = isDev
      ? { href: '/favicon-dev.svg', type: 'image/svg+xml' }
      : { href: '/favicon.ico', type: 'image/x-icon' };
    const manifest = isDev ? '/manifest-dev.json' : '/manifest.json';

    return {
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          name: 'mobile-web-app-capable',
          content: 'yes',
        },
        {
          name: 'apple-mobile-web-app-capable',
          content: 'yes',
        },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        },
        {
          title,
        },
      ],
      links: [
        {
          rel: 'stylesheet',
          href: appCss,
        },
        {
          rel: 'icon',
          ...favicon,
        },
        {
          rel: 'manifest',
          href: manifest,
        },
      ],
    };
  },

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Toaster richColors />
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
