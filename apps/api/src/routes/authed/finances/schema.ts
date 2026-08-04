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
  timeZone: z.string().trim().min(1).max(80).optional(),
});

export const financeTransactionListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const financeMovementListQuerySchema = financesSummaryQuerySchema.extend(
  {
    limit: z.coerce.number().int().positive().max(50).default(20),
    cursor: z.string().trim().min(1).optional(),
  },
);

export const financeAccountListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
});

export const financeAccountMovementListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
});

export const financeAccountParamsSchema = z.object({
  id: z.string().min(1),
});

const financeAccountTypeSchema = z.enum([
  'cash',
  'bank',
  'savings',
  'credit_card',
  'term_deposit',
  'wallet',
  'other',
]);

export const createFinanceAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: financeAccountTypeSchema,
  institution: z.string().trim().max(100).optional(),
  currency: currencySchema.default('COP'),
  currentBalance: z.number(),
  availableBalance: z.number().optional(),
  lockedBalance: z.number().nonnegative().optional(),
  creditLimit: z.number().positive().optional(),
  openedAt: z.coerce.date().optional(),
  maturesAt: z.coerce.date().optional(),
  interestRate: z.number().nonnegative().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const updateFinanceAccountSchema = createFinanceAccountSchema
  .partial()
  .extend({
    status: z.enum(['active', 'closed', 'matured']).optional(),
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
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

export const financeTransactionParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateFinanceTransactionSchema = z.object({
  description: z.string().trim().min(1).max(160).optional(),
  amount: z.number().positive().optional(),
  occurredAt: z.coerce.date().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  accountId: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
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
export type FinanceMovementListQueryInput = z.infer<
  typeof financeMovementListQuerySchema
>;
export type FinanceAccountListQueryInput = z.infer<
  typeof financeAccountListQuerySchema
>;
export type FinanceAccountMovementListQueryInput = z.infer<
  typeof financeAccountMovementListQuerySchema
>;
export type CreateFinanceAccountInput = z.infer<
  typeof createFinanceAccountSchema
>;
export type UpdateFinanceAccountInput = z.infer<
  typeof updateFinanceAccountSchema
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
