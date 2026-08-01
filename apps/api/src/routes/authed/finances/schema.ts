import * as z from 'zod';

const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());
const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional();

export const financesSummaryQuerySchema = z.object({
  month: monthSchema,
  currency: currencySchema.default('COP'),
});

export const financeTransactionListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const createFinanceTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: currencySchema.default('COP'),
  description: z.string().trim().min(1).max(160),
  occurredAt: z.coerce.date().optional(),
  categoryId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const financeTransactionParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateFinanceTransactionSchema = z.object({
  description: z.string().trim().min(1).max(160).optional(),
  categoryId: z.string().min(1).nullable().optional(),
});

export const createFinanceCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['income', 'expense', 'both']),
  icon: z.string().trim().max(32).optional(),
  color: z.string().trim().max(32).optional(),
});

export const financeCategoryParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateFinanceCategorySchema =
  createFinanceCategorySchema.partial();

export const upsertFinanceBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().nonnegative(),
  currency: currencySchema.default('COP'),
});

export type FinancesSummaryQueryInput = z.infer<
  typeof financesSummaryQuerySchema
>;
export type CreateFinanceTransactionInput = z.infer<
  typeof createFinanceTransactionSchema
>;
export type UpdateFinanceTransactionInput = z.infer<
  typeof updateFinanceTransactionSchema
>;
export type CreateFinanceCategoryInput = z.infer<
  typeof createFinanceCategorySchema
>;
export type UpdateFinanceCategoryInput = z.infer<
  typeof updateFinanceCategorySchema
>;
export type UpsertFinanceBudgetInput = z.infer<
  typeof upsertFinanceBudgetSchema
>;
