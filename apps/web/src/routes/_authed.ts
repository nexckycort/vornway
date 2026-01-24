import { createFileRoute, redirect } from '@tanstack/react-router';
import { getLocalUser } from '~/lib/local-user';

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ location }) => {
    const user = getLocalUser();
    if (!user?.name) {
      throw redirect({
        to: '/welcome',
        search: {
          redirect: location.href,
        },
      });
    }
    return { user };
  },
});
