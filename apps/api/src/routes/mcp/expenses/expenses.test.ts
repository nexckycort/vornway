import { describe, expect, it } from 'bun:test';
import { createExpensesHealth } from './expenses-health';

describe('expenses health operations', () => {
  it('returns health', async () => {
    const expenseOperations = createExpensesHealth();

    await expect(expenseOperations.getHealth()).resolves.toEqual({
      module: 'expenses',
      status: 'ok',
    });
  });
});
