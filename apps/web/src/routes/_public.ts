import { createFileRoute, redirect } from '@tanstack/react-router';
import { getLocalUser } from '~/lib/local-user';

const fallback = '/' as const;

export const Route = createFileRoute('/_public')({
  validateSearch: (
    search: Record<string, string>,
  ): { redirect?: string; t?: string } => {
    return {
      redirect: search.redirect,
      t: search.t,
    };
  },
  beforeLoad: ({ search }) => {
    const user = getLocalUser();
    if (user?.name) {
      throw redirect({
        to: (search as Record<string, string>).redirect || fallback,
      });
    }
  },
});
