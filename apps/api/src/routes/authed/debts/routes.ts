import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AppContext } from '#/shared/types/app';
import { debtOperations } from './operations';
import {
  createDebtSchema,
  createPaymentSchema,
  debtIdSchema,
  debtListSchema,
  paymentIdSchema,
  updateDebtSchema,
  updatePaymentSchema,
} from './schema';

export const debtsRoutes = new Hono<AppContext>()
  .get('/', zValidator('query', debtListSchema), async (c) =>
    c.json(await debtOperations.list(c.get('user').id, c.req.valid('query'))),
  )
  .post('/', zValidator('json', createDebtSchema), async (c) =>
    c.json(
      await debtOperations.create(c.get('user').id, c.req.valid('json')),
      201,
    ),
  )
  .get('/:id', zValidator('param', debtIdSchema), async (c) => {
    const result = await debtOperations.get(
      c.get('user').id,
      c.req.valid('param').id,
    );
    return result ? c.json(result) : c.json({ error: 'Debt not found' }, 404);
  })
  .patch(
    '/:id',
    zValidator('param', debtIdSchema),
    zValidator('json', updateDebtSchema),
    async (c) => {
      const result = await debtOperations.update(
        c.get('user').id,
        c.req.valid('param').id,
        c.req.valid('json'),
      );
      return result ? c.json(result) : c.json({ error: 'Debt not found' }, 404);
    },
  )
  .delete('/:id', zValidator('param', debtIdSchema), async (c) => {
    const deleted = await debtOperations.delete(
      c.get('user').id,
      c.req.valid('param').id,
    );
    return deleted
      ? c.json({ deleted: true })
      : c.json({ error: 'Debt not found' }, 404);
  })
  .post(
    '/:id/payments',
    zValidator('param', debtIdSchema),
    zValidator('json', createPaymentSchema),
    async (c) => {
      const result = await debtOperations.payment(
        c.get('user').id,
        c.req.valid('param').id,
        c.req.valid('json'),
      );
      return result
        ? c.json(result, 201)
        : c.json({ error: 'Debt not found' }, 404);
    },
  )
  .patch(
    '/:id/payments/:paymentId',
    zValidator('param', paymentIdSchema),
    zValidator('json', updatePaymentSchema),
    async (c) => {
      const params = c.req.valid('param');
      const result = await debtOperations.updatePayment(
        c.get('user').id,
        params.id,
        params.paymentId,
        c.req.valid('json'),
      );
      return result
        ? c.json(result)
        : c.json({ error: 'Payment not found' }, 404);
    },
  )
  .delete(
    '/:id/payments/:paymentId',
    zValidator('param', paymentIdSchema),
    async (c) => {
      const params = c.req.valid('param');
      const result = await debtOperations.deletePayment(
        c.get('user').id,
        params.id,
        params.paymentId,
      );
      return result
        ? c.json(result)
        : c.json({ error: 'Payment not found' }, 404);
    },
  );

export type DebtsRpc = typeof debtsRoutes;
