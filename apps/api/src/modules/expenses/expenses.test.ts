import { describe, expect, it } from 'bun:test';
import { createExpensesService } from './service';

describe('expenses service', () => {
  it('returns health', async () => {
    const service = createExpensesService();

    await expect(service.getHealth()).resolves.toEqual({
      module: 'expenses',
      status: 'ok',
    });
  });
});
