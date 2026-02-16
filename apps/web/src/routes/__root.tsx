import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  useLocation,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { createServerFn } from '@tanstack/react-start';
import { BottomNav } from '~/components/bottom-nav';
import { DesktopSidebar } from '~/components/desktop-sidebar';
import { Toaster } from '@workspace/ui/components/sonner';
import stylesCss from '../styles.css?url';
import { serverEnv } from '~/config/env.server';
import { getCurrentUserFn } from '~/server/auth';
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';
import { useIsMobile } from '~/hooks/use-mobile';

interface MyRouterContext {
  queryClient: QueryClient;
}

const getAppEnv = createServerFn().handler(() => {
  return serverEnv.APP_ENV;
});

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
    const appEnv = await getAppEnv();
    return { isDev: appEnv === 'dev' };
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
          href: stylesCss,
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

  component: RootLayout,
  shellComponent: RootDocument,
});

function RootLayout() {
  const { user } = Route.useRouteContext();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();

  const showPrimaryNav =
    Boolean(user) &&
    (pathname === '/' ||
      pathname === '/goals' ||
      pathname === '/activity' ||
      pathname === '/profile');

  return (
    <>
      <div className={showPrimaryNav && isMobile === false ? 'lg:pl-[18rem]' : ''}>
        <Outlet />
      </div>
      {showPrimaryNav
        ? isMobile === undefined
          ? null
          : isMobile
            ? <BottomNav />
            : <DesktopSidebar />
        : null}
    </>
  );
}

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
