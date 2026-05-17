import * as z from 'zod';

export const listGroupsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export const groupParamsSchema = z.object({
  id: z.string().min(1),
});

export const listGroupExpensesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export const createGroupExpenseSchema = z.object({
  description: z.string().min(1).max(160),
  amount: z.number().positive(),
  currency: z.string().min(1).max(8),
  paidById: z.string().min(1),
  participantIds: z.array(z.string().min(1)).default([]),
});

export const settleGroupDebtSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1).max(8),
});

export const addGroupMemberSchema = z.object({
  name: z.string().min(1).max(120),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(60),
  description: z.string().max(400).optional(),
  participants: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        userId: z.string().min(1).optional(),
      }),
    )
    .max(200)
    .optional(),
});

export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>;
