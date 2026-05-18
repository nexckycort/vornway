import * as z from 'zod';

export const listGroupsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  filter: z.enum(['all', 'theyOweYou', 'youOweThem', 'noDebt']).default('all'),
});

export const groupParamsSchema = z.object({
  id: z.string().min(1),
});

export const groupExpenseParamsSchema = z.object({
  id: z.string().min(1),
  expenseId: z.string().min(1),
});

export const groupMemberParamsSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
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
  splitMethod: z.enum(['equal', 'percentage', 'exact']).default('equal'),
  exactShares: z.record(z.string(), z.number().nonnegative()).optional(),
});

export const settleGroupDebtSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1).max(8),
});

export const addGroupMemberSchema = z.object({
  name: z.string().min(1).max(120),
  linkedUserId: z.string().min(1).optional(),
});

export const groupMemberActionQuerySchema = z.object({
  unlink: z.coerce.boolean().optional(),
});

export const searchGroupMembersQuerySchema = z.object({
  query: z.string().trim().min(1).max(120),
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
