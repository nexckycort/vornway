import { createFileRoute, redirect } from '@tanstack/react-router';

const fallback = '/' as const;

export const Route = createFileRoute('/_public')({
  validateSearch: (search: Record<string, string>) => {
    return {
      redirect: search.redirect,
    };
  },
  beforeLoad: ({ search, context }) => {
    if (context.user && !context.user.isAnonymous) {
      throw redirect({
        to: search.redirect || fallback,
      });
    }
  },
});
