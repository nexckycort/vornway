import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { feedbackService } from '#/modules/feedback/service';
import type { AppContext } from '#/shared/types/app';
import { feedbackIdParamSchema } from './feedback.params';
import {
  createFeedbackSchema,
  listFeedbackQuerySchema,
} from './feedback.validators';

const app = new Hono<AppContext>()
  .get('/', zValidator('query', listFeedbackQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const result = await feedbackService.listForUser({
      userId,
      limit: query.limit,
      cursor: query.cursor ?? null,
    });

    return c.json(result);
  })
  .post('/', zValidator('json', createFeedbackSchema), async (c) => {
    const body = c.req.valid('json');
    const { id: userId } = c.get('user');

    try {
      const result = await feedbackService.create({
        userId,
        type: body.type,
        title: body.title,
        description: body.description,
        priority: body.priority ?? null,
        metadata: body.metadata,
        images: body.images,
      });

      return c.json(result, 201);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }

      throw error;
    }
  })
  .delete(
    '/:feedbackId',
    zValidator('param', feedbackIdParamSchema),
    async (c) => {
      const { feedbackId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        await feedbackService.delete({
          userId,
          feedbackId,
        });

        return c.json({ success: true });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Reporte no encontrado') {
            return c.json({ error: error.message }, 404);
          }

          return c.json({ error: error.message }, 400);
        }

        throw error;
      }
    },
  );

export default app;
