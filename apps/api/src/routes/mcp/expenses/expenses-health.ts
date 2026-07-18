import type { ExpensesHealth } from './types';

export type ExpensesHealthOperations = {
  getHealth: () => Promise<ExpensesHealth>;
};

export function createExpensesHealth(): ExpensesHealthOperations {
  return {
    getHealth: async () => ({
      module: 'expenses',
      status: 'ok',
    }),
  };
}
