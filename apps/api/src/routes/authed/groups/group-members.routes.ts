import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { createGroupMembersOperations } from './group-members.commands';
import { groupRouteErrorResponse } from './groups.errors';
import {
  addGroupMemberSchema,
  groupMemberParamsSchema,
  groupParamsSchema,
  searchGroupMembersQuerySchema,
} from './groups.validators';

const groupMemberOperations = createGroupMembersOperations();

export const groupMembersRoutes = new Hono<AppContext>()
  .get(
    '/:id/members/search',
    zValidator('param', groupParamsSchema),
    zValidator('query', searchGroupMembersQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { query } = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupMemberOperations.searchMembers({
          userId,
          groupId: id,
          query,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .post(
    '/:id/members',
    zValidator('param', groupParamsSchema),
    zValidator('json', addGroupMemberSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupMemberOperations.addMember({
          userId,
          groupId: id,
          name: data.name,
          linkedUserId: data.linkedUserId,
        });
        return c.json(result, 201);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .delete(
    '/:id/members/:memberId/account-link',
    zValidator('param', groupMemberParamsSchema),
    async (c) => {
      const { id, memberId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        const result = await groupMemberOperations.unlinkMember({
          userId,
          groupId: id,
          memberId,
        });
        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .delete(
    '/:id/members/:memberId',
    zValidator('param', groupMemberParamsSchema),
    async (c) => {
      const { id, memberId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        const result = await groupMemberOperations.removeMember({
          userId,
          groupId: id,
          memberId,
        });
        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  );
