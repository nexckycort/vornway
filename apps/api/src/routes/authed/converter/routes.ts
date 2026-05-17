import { Hono } from 'hono';

import { getCurrencyConverter } from '~/modules/converter/service';
import type { AppContext } from '~/shared/types/app';

const converter = new Hono<AppContext>().get('/', async (c) => {
  const { id: userId } = c.get('user');

  if (!userId) {
    return c.json({ error: 'No autenticado' }, 401);
  }

  const result = await getCurrencyConverter();
  return c.json(result);
});

export default converter;
