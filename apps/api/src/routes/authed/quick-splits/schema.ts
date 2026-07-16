import * as z from 'zod';

export const createQuickSplitSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(400).optional(),
    participants: z
      .array(
        z.object({
          clientId: z.string().trim().min(1).max(120).optional(),
          name: z.string().trim().min(1).max(120),
          userId: z.string().trim().min(1).optional(),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine(
    (data) =>
      new Set(
        data.participants.map((participant) =>
          participant.userId
            ? `user:${participant.userId}`
            : `name:${participant.name.toLocaleLowerCase('es-CO')}`,
        ),
      ).size === data.participants.length,
    {
      message: 'No puedes repetir participantes',
      path: ['participants'],
    },
  );

export type CreateQuickSplitInput = z.infer<typeof createQuickSplitSchema>;

export const quickSplitParamsSchema = z.object({
  id: z.string().min(1),
});

export const quickSplitExpenseParamsSchema = z.object({
  id: z.string().min(1),
  expenseId: z.string().min(1),
});

export const listRecentQuickSplitExpensesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
});

export type ListRecentQuickSplitExpensesQueryInput = z.infer<
  typeof listRecentQuickSplitExpensesQuerySchema
>;

export const listQuickSplitExpensesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  cursor: z.string().trim().min(1).optional(),
});

export type ListQuickSplitExpensesQueryInput = z.infer<
  typeof listQuickSplitExpensesQuerySchema
>;

export const createQuickSplitExpenseSchema = z
  .object({
    id: z.string().min(1).optional(),
    description: z.string().trim().min(1).max(200),
    amount: z.number().positive(),
    currency: z.string().trim().length(3),
    paidByParticipantId: z.string().min(1).optional(),
    participantIds: z.array(z.string().min(1)).min(1).max(20),
    splitMethod: z.enum(['equal', 'percentage', 'exact']).default('equal'),
    percentageShares: z
      .record(z.string().min(1), z.number().positive())
      .optional(),
    exactShares: z
      .record(z.string().min(1), z.number().nonnegative())
      .optional(),
  })
  .refine(
    (data) => new Set(data.participantIds).size === data.participantIds.length,
    {
      message: 'No puedes repetir participantes',
      path: ['participantIds'],
    },
  )
  .superRefine((data, ctx) => {
    if (data.splitMethod === 'percentage' && !data.percentageShares) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Debes enviar percentageShares cuando splitMethod es percentage',
        path: ['percentageShares'],
      });
    }

    if (data.splitMethod === 'exact' && !data.exactShares) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes enviar exactShares cuando splitMethod es exact',
        path: ['exactShares'],
      });
    }
  });

export type CreateQuickSplitResult = {
  id: string;
  name: string;
  description: string | null;
  participants: Array<{
    id: string;
    clientId?: string;
    userId: string | null;
    name: string;
    role: string;
  }>;
  createdAt: string;
};

export type CreateQuickSplitExpenseInput = z.infer<
  typeof createQuickSplitExpenseSchema
>;

export type CreateQuickSplitExpenseResult = {
  id: string;
  quickSplitId: string;
  description: string;
  amount: number;
  currency: string;
  paidByParticipantId: string;
  splitMethod: 'equal' | 'percentage' | 'exact';
  participants: Array<{
    participantId: string;
    share: number;
  }>;
  createdAt: string;
};

export type QuickSplitExpenseFeedItem = {
  id: string;
  quickSplitId: string;
  quickSplitName: string;
  description: string;
  amount: number;
  currency: string;
  participantCount: number;
  paidBy: {
    id: string;
    userId: string | null;
    name: string;
  };
  createdAt: string;
};

export type ListRecentQuickSplitExpensesResult = {
  data: QuickSplitExpenseFeedItem[];
};

export type ListQuickSplitExpensesResult = {
  data: QuickSplitExpenseFeedItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

export type QuickSplitExpenseDetailResult = {
  id: string;
  quickSplitId: string;
  quickSplitName: string;
  description: string;
  amount: number;
  currency: string;
  splitMethod: 'equal' | 'percentage' | 'exact';
  createdAt: string;
  paidBy: {
    id: string;
    userId: string | null;
    name: string;
    image: string | null;
  };
  participants: Array<{
    id: string;
    userId: string | null;
    name: string;
    image: string | null;
    share: number;
    role: string;
  }>;
};

export type DeleteQuickSplitExpenseResult = {
  id: string;
};
