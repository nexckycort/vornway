import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Hono } from 'hono';

import { createExpensesModule } from '../modules/expenses';
import { createGroupsModule } from '../modules/groups';
import { createLoginModule } from '../modules/login';

const loginModule = createLoginModule();
const groupsModule = createGroupsModule();
const expensesModule = createExpensesModule();

export function registerHttpModules(app: Hono): void {
  loginModule.mountHttp(app);
  groupsModule.mountHttp(app);
  expensesModule.mountHttp(app);
}

export function registerMcpModules(server: McpServer): void {
  groupsModule.mountMcp(server);
  expensesModule.mountMcp(server);
}
