import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import type { AuthContextProps } from '#/contexts/auth/auth-context';

export const Route = createRootRouteWithContext<{
  auth: AuthContextProps;
}>()({
  component: RootComponent,
});

function RootComponent() {
  return <Outlet />;
}
