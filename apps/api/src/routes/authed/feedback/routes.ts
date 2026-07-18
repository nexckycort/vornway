import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AppContext } from '#/shared/types/app';
import { createFeedback } from './create-feedback.command';
import { deleteFeedback } from './delete-feedback.command';
import { listFeedbackForUser } from './list-feedback.query';
import {
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbackQuerySchema,
} from './schema';

export const feedbackRoutes = new Hono<AppContext>()
  .get('/', zValidator('query', listFeedbackQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const result = await listFeedbackForUser({
      userId,
      limit: query.limit,
      cursor: query.cursor,
    });

    return c.json(result);
  })
  .post('/', zValidator('json', createFeedbackSchema), async (c) => {
    const body = c.req.valid('json');
    const { id: userId } = c.get('user');

    const result = await createFeedback({
      userId,
      type: body.type,
      title: body.title,
      description: body.description,
      priority: body.priority,
      metadata: body.metadata,
      images: body.images,
    });

    return c.json(result, 201);
  })
  .delete(
    '/:feedbackId',
    zValidator('param', feedbackIdParamSchema),
    async (c) => {
      const { feedbackId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      const result = await deleteFeedback({ userId, feedbackId });
      return c.json(result);
    },
  );

export default feedbackRoutes;

export type FeedbackRpc = typeof feedbackRoutes;
export type FeedbackAppType = FeedbackRpc;
