import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { runHttpEffect } from '#/shared/effect/run-effect';
import type { AppContext } from '#/shared/types/app';
import {
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbackQuerySchema,
} from './schema';
import { feedbackService } from './service';

const app = new Hono<AppContext>()
  .get('/', zValidator('query', listFeedbackQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    return runHttpEffect(
      c,
      feedbackService.listForUser({
        userId,
        limit: query.limit,
        cursor: query.cursor,
      }),
    );
  })
  .post('/', zValidator('json', createFeedbackSchema), async (c) => {
    const body = c.req.valid('json');
    const { id: userId } = c.get('user');

    return runHttpEffect(
      c,
      feedbackService.create({
        userId,
        type: body.type,
        title: body.title,
        description: body.description,
        priority: body.priority,
        metadata: body.metadata,
        images: body.images,
      }),
      201,
    );
  })
  .delete(
    '/:feedbackId',
    zValidator('param', feedbackIdParamSchema),
    async (c) => {
      const { feedbackId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      return runHttpEffect(
        c,
        feedbackService.delete({
          userId,
          feedbackId,
        }),
      );
    },
  );

export default app;

export type FeedbackAppType = typeof app;
