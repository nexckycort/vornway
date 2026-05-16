import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/groups/new')({
  component: Outlet,
});
