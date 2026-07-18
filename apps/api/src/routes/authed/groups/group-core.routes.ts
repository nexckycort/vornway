import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { createGroupCreateOperations } from './create-group.command';
import { createGroupDeleteOperations } from './delete-group.command';
import { createGroupExportOperations } from './export-group-csv.query';
import { createGroupSummaryOperations } from './get-group-summary.query';
import { groupRouteErrorResponse } from './groups.errors';
import {
  createGroupSchema,
  groupImageSchema,
  groupParamsSchema,
  listGroupsQuerySchema,
  updateGroupSchema,
  updateGroupSettingsSchema,
} from './groups.validators';
import { createGroupListOperations } from './list-groups.query';
import { createGroupUpdateOperations } from './update-group.command';
import { createGroupImageOperations } from './update-group-image.command';

const groupCoreOperations = {
  ...createGroupCreateOperations(),
  ...createGroupDeleteOperations(),
  ...createGroupExportOperations(),
  ...createGroupSummaryOperations(),
  ...createGroupListOperations(),
  ...createGroupUpdateOperations(),
  ...createGroupImageOperations(),
};

export const groupCoreRoutes = new Hono<AppContext>()
  .post('/', zValidator('json', createGroupSchema), async (c) => {
    const data = c.req.valid('json');
    const { id: userId, name, email } = c.get('user');

    const group = await groupCoreOperations.createGroup({
      id: data.id,
      userId,
      ownerName: name?.trim() || email || 'Usuario',
      name: data.name,
      type: data.type,
      description: data.description,
      image: data.image,
      participants: data.participants,
    });

    return c.json(group, 201);
  })
  .get('/', zValidator('query', listGroupsQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const result = await groupCoreOperations.listGroups({
      userId,
      limit: query.limit,
      cursor: query.cursor,
      search: query.search,
      filter: query.filter,
    });

    return c.json(result);
  })
  .get('/:id', zValidator('param', groupParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await groupCoreOperations.getGroupSummary({
        userId,
        groupId: id,
      });
      return c.json(result);
    } catch (error) {
      return groupRouteErrorResponse(c, error);
    }
  })
  .get('/:id/export', zValidator('param', groupParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await groupCoreOperations.exportGroupCsv({
        userId,
        groupId: id,
      });

      return c.body(result.content, 200, {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Cache-Control': 'no-store',
      });
    } catch (error) {
      return groupRouteErrorResponse(c, error);
    }
  })
  .delete('/:id', zValidator('param', groupParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await groupCoreOperations.deleteGroup({
        userId,
        groupId: id,
      });
      return c.json(result);
    } catch (error) {
      return groupRouteErrorResponse(c, error);
    }
  })
  .patch(
    '/:id',
    zValidator('param', groupParamsSchema),
    zValidator('json', updateGroupSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupCoreOperations.updateGroup({
          userId,
          groupId: id,
          name: data.name,
          type: data.type,
          description: data.description,
          image: data.image,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .patch(
    '/:id/settings',
    zValidator('param', groupParamsSchema),
    zValidator('json', updateGroupSettingsSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupCoreOperations.updateGroupSettings({
          userId,
          groupId: id,
          advancedExpenseDetailsEnabled: data.advancedExpenseDetailsEnabled,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .patch(
    '/:id/image',
    zValidator('param', groupParamsSchema),
    zValidator('json', groupImageSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupCoreOperations.updateGroupImage({
          userId,
          groupId: id,
          image: data,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  );
