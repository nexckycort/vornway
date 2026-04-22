import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpModules } from './modules';

export function createMcpApp(): McpServer {
  const server = new McpServer({
    name: 'vornway',
    version: '0.0.1',
  });

  registerMcpModules(server);

  return server;
}
