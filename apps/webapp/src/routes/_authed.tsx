import { BottomAppBar } from '#/components/bottom-app-bar';
import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router';

export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
  beforeLoad: async ({ location, context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          // Use the current location to power a redirect after login
          // (Do not use `router.state.resolvedLocation` as it can
          // potentially lag behind the actual current location)
          redirect: location.href,
        },
      });
    }
  },
});

const MAIN_VIEWS = new Set([
  '/',
  '/groups',
  '/groups/',
  '/goals',
  '/goals/',
  '/profile',
  '/profile/',
]);

function AuthedLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const showBottomBar = MAIN_VIEWS.has(pathname);

  return (
    <div className="mobile-shell">
      <Outlet />
      {showBottomBar ? <BottomAppBar /> : null}
    </div>
  );
}
