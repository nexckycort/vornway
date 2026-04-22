import type { ExpensesHealth } from './types';

export type ExpensesService = {
  getHealth: () => Promise<ExpensesHealth>;
};

export function createExpensesService(): ExpensesService {
  return {
    getHealth: async () => ({
      module: 'expenses',
      status: 'ok',
    }),
  };
}
