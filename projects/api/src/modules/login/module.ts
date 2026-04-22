import type { ApiModule } from '../../app/module-contract';
import { createAuthProxyRouter } from './auth-routes';
import { createLoginRouter } from './routes';
import { createLoginService } from './service';

export function createLoginModule(): ApiModule {
  const service = createLoginService();

  return {
    name: 'login',
    mountHttp: (app) => {
      app.route('/api/login', createLoginRouter(service));
      app.route('/api/auth', createAuthProxyRouter());
    },
    mountMcp: () => {
      // Login module does not expose MCP tools.
    },
  };
}
