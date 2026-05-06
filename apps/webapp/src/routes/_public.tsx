import { createFileRoute, redirect } from '@tanstack/react-router';

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
  beforeLoad: async ({ search, context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({
        to: (search as Record<string, string>).redirect || fallback,
      });
    }
  },
});
