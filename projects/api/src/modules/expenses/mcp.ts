import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExpensesService } from './service';

export function registerExpensesTools(
  server: McpServer,
  service: ExpensesService,
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
        content: [{ type: 'text', text: JSON.stringify(health) }],
        structuredContent: health,
      };
    },
  );
}
