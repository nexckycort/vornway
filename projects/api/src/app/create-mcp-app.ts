import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAuthContext } from './module-contract';
import { registerMcpModules } from './modules';

export function createMcpApp(auth: McpAuthContext): McpServer {
  const server = new McpServer({
    name: 'vornway',
    version: '0.0.1',
  });

  registerMcpModules(server, auth);

  return server;
}
