import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGroupsTools } from '#/routes/authed/groups/mcp';
import { createExpensesHealth } from '#/routes/mcp/expenses/expenses-health';
import { registerExpensesTools } from '#/routes/mcp/expenses/mcp';
import type { McpAuthContext } from '#/routes/mcp/mcp-context';

export function createMcpApp(auth: McpAuthContext): McpServer {
  const server = new McpServer({
    name: 'vornway',
    version: '0.0.1',
  });

  registerGroupsTools(server, auth);
  registerExpensesTools(server, createExpensesHealth(), auth);

  return server;
}
