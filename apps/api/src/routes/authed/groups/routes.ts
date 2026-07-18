import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { groupCategoriesRoutes } from './group-categories.routes';
import { groupCoreRoutes } from './group-core.routes';
import { groupExpensesRoutes } from './group-expenses.routes';
import { groupMembersRoutes } from './group-members.routes';
import { groupReportsRoutes } from './group-reports.routes';

export const groupsRoutes = new Hono<AppContext>()
  .route('/', groupCoreRoutes)
  .route('/', groupCategoriesRoutes)
  .route('/', groupReportsRoutes)
  .route('/', groupExpensesRoutes)
  .route('/', groupMembersRoutes);

export default groupsRoutes;
export type GroupsRpc = typeof groupsRoutes;
