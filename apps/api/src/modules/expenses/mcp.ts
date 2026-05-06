import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAuthContext } from '../../app/module-contract';
import type { ExpensesService } from './service';

export function registerExpensesTools(
  server: McpServer,
  service: ExpensesService,
  auth: McpAuthContext,
): void {
  server.registerTool(
    'expenses_health',
    {
      title: 'Expenses Health',
      description: 'Healthcheck del modulo expenses',
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
