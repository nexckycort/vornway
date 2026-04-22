import type { ApiModule } from '../../app/module-contract';
import { createAuthProxyRouter } from './auth/auth-routes';
import { createLoginRouter } from './auth/routes';
import { createLoginService } from './auth/service';
import { createOAuthRouter } from './oauth/routes';

export function createLoginModule(): ApiModule {
  const service = createLoginService();

  return {
    name: 'login',
    mountHttp: (app) => {
      app.route('/api/login', createLoginRouter(service));
      app.route('/api/auth', createAuthProxyRouter());

      // OAuth endpoints for strict clients (/oauth/*)
      app.route('/oauth', createOAuthRouter(service));

      // Compatibility aliases for clients that expect root endpoints (/authorize, /token)
      app.route('/', createOAuthRouter(service));
    },
    mountMcp: () => {
      // Login module does not expose MCP tools.
    },
  };
}
