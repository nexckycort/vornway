import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAuthContext } from '#/routes/mcp/mcp-context';

export function registerGroupsTools(
  _server: McpServer,
  _auth: McpAuthContext,
): void {
  // Intencionalmente sin tools por ahora.
}
