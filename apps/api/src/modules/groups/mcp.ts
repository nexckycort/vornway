import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAuthContext } from '../../app/module-contract';
import type { GroupsService } from './service';

export function registerGroupsTools(
  _server: McpServer,
  _service: GroupsService,
  _auth: McpAuthContext,
): void {
  // Intencionalmente sin tools por ahora.
}
