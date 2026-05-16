import type { auth } from '../../infrastructure/auth/better-auth.config';

export type AppContext = {
  Variables: {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
};
