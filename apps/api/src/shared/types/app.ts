import type { auth } from '../../infrastructure/auth/legacy-auth';

export type AppContext = {
  Variables: {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
};

export type WithUserId<T> = T & {
  userId: string;
};
