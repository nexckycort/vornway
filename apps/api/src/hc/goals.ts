import { hc } from 'hono/client';
import type { GoalsRpc } from '#/routes/authed/goals/routes';

export type { GoalsRpc };

const goalsClient = hc<GoalsRpc>('');
export type GoalsClient = typeof goalsClient;

export const createGoalsClient = (
  ...args: Parameters<typeof hc>
): GoalsClient => hc<GoalsRpc>(...args);
