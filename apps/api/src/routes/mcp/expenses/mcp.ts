import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAuthContext } from '#/routes/mcp/mcp-context';
import type { ExpensesHealthOperations } from './expenses-health';

export function registerExpensesTools(
  server: McpServer,
  expenseOperations: ExpensesHealthOperations,
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
      const health = await expenseOperations.getHealth();

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
