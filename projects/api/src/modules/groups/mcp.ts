import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAuthContext } from '../../app/module-contract';
import type { GroupsService } from './service';

export function registerGroupsTools(
  server: McpServer,
  service: GroupsService,
  auth: McpAuthContext,
): void {
  server.registerTool(
    'groups_health',
    {
      title: 'Groups Health',
      description: 'Healthcheck del modulo groups',
      inputSchema: {},
    },
    async () => {
      const health = await service.getHealth();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...health, userId: auth.userId }),
          },
        ],
        structuredContent: {
          ...health,
          userId: auth.userId,
        },
      };
    },
  );
}
