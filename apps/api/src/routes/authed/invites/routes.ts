import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createInvitesService } from '#/modules/invites/service';
import type { AppContext } from '#/shared/types/app';
import { acceptInviteSchema, inviteParamsSchema } from './invites.validators';

const invitesService = createInvitesService();

const invites = new Hono<AppContext>()
  .get('/:inviteCode', zValidator('param', inviteParamsSchema), async (c) => {
    const { inviteCode } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await invitesService.getPreview({
        userId,
        inviteCode,
      });

      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Grupo no encontrado') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
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
        const result = await invitesService.acceptInvite({
          userId,
          userName: name ?? null,
          userEmail: email ?? null,
          inviteCode,
          memberId,
        });

        return c.json(result, 201);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }

          return c.json({ error: error.message }, 400);
        }

        throw error;
      }
    },
  );

export default invites;
