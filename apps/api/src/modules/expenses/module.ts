import type { ApiModule } from '../../app/module-contract';
import { registerExpensesTools } from './mcp';
import { createExpensesRouter } from './routes';
import { createExpensesService } from './service';

export function createExpensesModule(): ApiModule {
  const service = createExpensesService();

  return {
    name: 'expenses',
    mountHttp: (app) => {
      app.route('/api/expenses', createExpensesRouter(service));
    },
    mountMcp: (server, auth) => {
      registerExpensesTools(server, service, auth);
    },
  };
}
