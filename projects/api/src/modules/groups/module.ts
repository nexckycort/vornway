import type { ApiModule } from '../../app/module-contract';
import { registerGroupsTools } from './mcp';
import { createGroupsRouter } from './routes';
import { createGroupsService } from './service';

export function createGroupsModule(): ApiModule {
  const service = createGroupsService();

  return {
    name: 'groups',
    mountHttp: (app) => {
      app.route('/api/groups', createGroupsRouter(service));
    },
    mountMcp: (server, auth) => {
      registerGroupsTools(server, service, auth);
    },
  };
}
