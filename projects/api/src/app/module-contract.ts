import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Hono } from 'hono';

export type McpAuthContext = {
  userId: string;
  email: string;
  name: string | null;
};

export type ApiModule = {
  name: string;
  mountHttp: (app: Hono) => void;
  mountMcp: (server: McpServer, auth: McpAuthContext) => void;
};
