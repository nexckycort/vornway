import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { getCurrencyConverter } from './get-currency-converter.query';

export const converterRoutes = new Hono<AppContext>().get('/', async (c) => {
  const { id: userId } = c.get('user');

  if (!userId) {
    return c.json({ error: 'No autenticado' }, 401);
  }

  const result = await getCurrencyConverter();
  return c.json(result);
});

export default converterRoutes;
export type ConverterRpc = typeof converterRoutes;
