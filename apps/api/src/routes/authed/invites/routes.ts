import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { createInviteOperations } from './invite-operations';
import { inviteRouteErrorResponse } from './invites.errors';
import { acceptInviteSchema, inviteParamsSchema } from './invites.validators';

const inviteOperations = createInviteOperations();

export const invitesRoutes = new Hono<AppContext>()
  .get('/:inviteCode', zValidator('param', inviteParamsSchema), async (c) => {
    const { inviteCode } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await inviteOperations.getPreview({
        userId,
        inviteCode,
      });

      return c.json(result);
    } catch (error) {
      return inviteRouteErrorResponse(c, error);
    }
  })
  .post(
    '/:inviteCode/accept',
    zValidator('param', inviteParamsSchema),
    zValidator('json', acceptInviteSchema),
    async (c) => {
      const { inviteCode } = c.req.valid('param');
      const { memberId } = c.req.valid('json');
      const { id: userId, name, email } = c.get('user');

      try {
        const result = await inviteOperations.acceptInvite({
          userId,
          userName: name ?? null,
          userEmail: email ?? null,
          inviteCode,
          memberId,
        });

        return c.json(result, 201);
      } catch (error) {
        return inviteRouteErrorResponse(c, error);
      }
    },
  );

export default invitesRoutes;
export type InvitesRpc = typeof invitesRoutes;
