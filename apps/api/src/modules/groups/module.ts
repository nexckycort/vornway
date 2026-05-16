import type { ApiModule } from '../../app/module-contract';
import { registerGroupsTools } from './mcp';
import { createGroupsService } from './service';

export function createGroupsModule(): ApiModule {
  const service = createGroupsService();

  return {
    name: 'groups',
    mountHttp: () => {},
    mountMcp: (server, auth) => {
      registerGroupsTools(server, service, auth);
    },
  };
}
