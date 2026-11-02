import { Effect } from 'effect';
import type { McpUser } from './token';

export type McpTool = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly run: (user: McpUser) => Effect.Effect<Record<string, unknown>>;
};

const expensesHealth: McpTool = {
  name: 'expenses_health',
  title: 'Expenses Health',
  description: 'Healthcheck del modulo expenses',
  run: (user) =>
    Effect.succeed({ module: 'expenses', status: 'ok', userId: user.id }),
};

export const mcpTools: readonly McpTool[] = [expensesHealth];
