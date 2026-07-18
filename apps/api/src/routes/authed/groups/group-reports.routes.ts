import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { createGroupReportsOperations } from './group-reports.queries';
import { groupRouteErrorResponse } from './groups.errors';
import {
  groupParamsSchema,
  groupReportsCategoryCountQuerySchema,
  groupReportsTotalsQuerySchema,
} from './groups.validators';

const groupReportOperations = createGroupReportsOperations();

export const groupReportsRoutes = new Hono<AppContext>()
  .get(
    '/:id/reports/totals',
    zValidator('param', groupParamsSchema),
    zValidator('query', groupReportsTotalsQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupReportOperations.getGroupReportsTotals({
          userId,
          groupId: id,
          range: query.range,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .get(
    '/:id/reports/category-count',
    zValidator('param', groupParamsSchema),
    zValidator('query', groupReportsCategoryCountQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupReportOperations.getGroupReportsCategoryCount(
          {
            userId,
            groupId: id,
            range: query.range,
            startDate: query.startDate,
            endDate: query.endDate,
            categoryId: query.categoryId,
            uncategorized: query.uncategorized,
            currency: query.currency,
            participantIds: query.participantIds
              ?.split(',')
              .map((value) => value.trim())
              .filter(Boolean),
          },
        );

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .get(
    '/:id/reports/balances',
    zValidator('param', groupParamsSchema),
    zValidator('query', groupReportsTotalsQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupReportOperations.getGroupReportsBalances({
          userId,
          groupId: id,
          range: query.range,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .get(
    '/:id/reports/shares',
    zValidator('param', groupParamsSchema),
    zValidator('query', groupReportsTotalsQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupReportOperations.getGroupReportsShares({
          userId,
          groupId: id,
          range: query.range,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  );
