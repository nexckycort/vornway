import * as z from 'zod';

export const debtIdSchema = z.object({ id: z.string().min(1) });
const direction = z.enum(['lent', 'borrowed']);
const interestType = z.enum(['none', 'percentage', 'fixed']);
export const debtAmountSchema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1).optional(),
  loanDate: z.coerce.date(),
});

export const createDebtSchema = z.object({
  name: z.string().trim().min(1).max(120),
  counterpartyName: z.string().trim().min(1).max(120),
  counterpartyId: z.string().min(1).optional(),
  direction,
  principalAmount: z.number().positive(),
  amounts: z.array(debtAmountSchema).min(1).optional(),
  interestType: interestType.default('none'),
  interestValue: z.number().nonnegative().optional(),
  currency: z.string().trim().length(3),
  dueDate: z.coerce.date().nullable().optional(),
  description: z.string().trim().max(400).optional(),
});
export const updateDebtSchema = createDebtSchema.partial();
export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1).optional(),
  paidAt: z.coerce.date().optional(),
  note: z.string().trim().max(400).optional(),
});
export const updatePaymentSchema = createPaymentSchema.partial().extend({
  accountId: z.string().min(1).nullable().optional(),
});
export const paymentIdSchema = z.object({
  id: z.string().min(1),
  paymentId: z.string().min(1),
});
export const debtAmountIdSchema = z.object({
  id: z.string().min(1),
  amountId: z.string().min(1),
});
export const updateDebtAmountSchema = debtAmountSchema.partial();
export const debtListSchema = z.object({
  status: z.enum(['active', 'paid', 'overdue', 'all']).default('active'),
  search: z.string().trim().max(120).optional(),
});
export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type CreateDebtAmountInput = z.infer<typeof debtAmountSchema>;
export type UpdateDebtAmountInput = z.infer<typeof updateDebtAmountSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
