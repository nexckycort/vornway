import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { AppBadgeSync } from '#/components/app-badge-sync';
import { BottomAppBar } from '#/components/bottom-app-bar';
import { UsernameRequirementProvider } from '#/contexts/username-requirement/username-requirement-context';
import { MAIN_VIEW_PATHS } from '#/lib/browser-back-navigation';

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

function isNonHomeMainView(pathname: string) {
  return MAIN_VIEW_PATHS.has(pathname) && pathname !== '/';
}

function MainTabBackToHome() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const returnToHome = () => {
      if (!isNonHomeMainView(pathnameRef.current)) return false;
      if (
        document.querySelector(
          '[data-slot="drawer-content"], [data-slot="dialog-content"]',
        )
      ) {
        return false;
      }

      void navigate({ to: '/', replace: true });
      return true;
    };

    const handleNativeBack = (event: Event) => {
      if (!returnToHome()) return;
      event.preventDefault();
    };

    window.addEventListener('vornway:back', handleNativeBack);
    return () => {
      window.removeEventListener('vornway:back', handleNativeBack);
    };
  }, [navigate]);

  return null;
}

function AuthedLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const showBottomBar = MAIN_VIEW_PATHS.has(pathname);

  return (
    <UsernameRequirementProvider>
      <div className="mobile-shell">
        <AppBadgeSync />
        <MainTabBackToHome />
        <div className="mobile-shell-frame">
          <div>
            <Outlet />
          </div>
          {showBottomBar ? <BottomAppBar /> : null}
        </div>
      </div>
    </UsernameRequirementProvider>
  );
}
