import * as z from 'zod';

const dateRangeValueSchema = z.string().datetime({ offset: true });

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

export const groupCategoryParamsSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
});

export const listGroupExpensesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export const listGroupMemberExpensesQuerySchema = listGroupExpensesQuerySchema
  .extend({
    categoryId: z.string().min(1).optional(),
    uncategorized: z.coerce.boolean().optional(),
    paidOnly: z.coerce.boolean().optional(),
    startDate: dateRangeValueSchema.optional(),
    endDate: dateRangeValueSchema.optional(),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'La fecha final debe ser mayor o igual a la inicial',
      path: ['endDate'],
    },
  );

export const groupReportsTotalsQuerySchema = z
  .object({
    range: z.enum(['all', 'custom']).default('all'),
    startDate: dateRangeValueSchema.optional(),
    endDate: dateRangeValueSchema.optional(),
  })
  .refine(
    (data) =>
      data.range !== 'custom' ||
      (Boolean(data.startDate) && Boolean(data.endDate)),
    {
      message: 'Debes enviar fecha inicial y final',
      path: ['startDate'],
    },
  )
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'La fecha final debe ser mayor o igual a la inicial',
      path: ['endDate'],
    },
  );

export const groupReportsCategoryCountQuerySchema =
  groupReportsTotalsQuerySchema.extend({
    categoryId: z.string().min(1).optional(),
    uncategorized: z.coerce.boolean().optional(),
    currency: z.string().min(1).max(8),
    participantIds: z.string().trim().min(1).optional(),
  });

const expenseAttachmentImageSchema = z.object({
  dataUrl: z.string().min(1).max(15_000_000),
  fileName: z.string().min(1).max(200).optional(),
});

const expenseSharedSplitSchema = z.object({
  amount: z.number().positive(),
  splitMethod: z.enum(['percentage', 'exact']),
  splitValues: z.record(z.string(), z.number().nonnegative()).optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        amount: z.number().positive(),
      }),
    )
    .min(1)
    .optional(),
});

const expenseLineItemsSchema = z
  .array(
    z.object({
      memberId: z.string().min(1),
      description: z.string().trim().min(1).max(160),
      amount: z.number().positive(),
    }),
  )
  .max(100);

export const createGroupExpenseSchema = z
  .object({
    id: z.string().trim().min(1).max(120).optional(),
    description: z.string().min(1).max(160),
    amount: z.number().positive(),
    currency: z.string().min(1).max(8),
    categoryId: z.string().min(1).optional(),
    paidById: z.string().min(1).optional(),
    paidByIds: z.array(z.string().min(1)).min(1).optional(),
    payers: z
      .array(
        z.object({
          memberId: z.string().min(1),
          amount: z.number().positive(),
        }),
      )
      .min(1)
      .optional(),
    participantIds: z.array(z.string().min(1)).default([]),
    splitMethod: z.enum(['equal', 'percentage', 'exact']).default('equal'),
    exactShares: z.record(z.string(), z.number().nonnegative()).optional(),
    lineItems: expenseLineItemsSchema.optional(),
    sharedSplit: expenseSharedSplitSchema.optional(),
    attachmentImage: expenseAttachmentImageSchema.optional(),
    advancedDetails: z
      .object({
        type: z
          .enum(['stay', 'food', 'transport', 'activity', 'purchase', 'other'])
          .default('other'),
        placeName: z.string().trim().max(160).optional(),
        address: z.string().trim().max(240).optional(),
        mapUrl: z.string().trim().max(500).optional(),
        mapEmbedUrl: z.string().trim().max(1000).optional(),
        contactName: z.string().trim().max(120).optional(),
        phone: z.string().trim().max(80).optional(),
        email: z.string().trim().email().max(160).optional().or(z.literal('')),
        bookingCode: z.string().trim().max(120).optional(),
        reservationTime: z.string().trim().max(80).optional(),
        websiteUrl: z.string().trim().max(500).optional(),
        notes: z.string().trim().max(600).optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.lineItems || data.lineItems.length === 0) return true;
      if (data.splitMethod !== 'exact') return false;

      const totalsByMember = new Map<string, number>();
      for (const item of data.lineItems) {
        totalsByMember.set(
          item.memberId,
          (totalsByMember.get(item.memberId) ?? 0) + item.amount,
        );
      }

      return Array.from(totalsByMember).every(([memberId, itemTotal]) => {
        const expectedAmount =
          data.sharedSplit?.splitValues?.[memberId] ??
          data.exactShares?.[memberId];

        return (
          typeof expectedAmount === 'number' &&
          Math.abs(itemTotal - expectedAmount) < 0.01
        );
      });
    },
    {
      message:
        'El desglose de cada participante debe coincidir con su monto individual',
      path: ['lineItems'],
    },
  )
  .refine(
    (data) =>
      (data.paidByIds?.length ?? 0) > 0 || Boolean(data.paidById?.trim()),
    {
      message: 'Debes seleccionar al menos una persona que pagó',
      path: ['paidByIds'],
    },
  )
  .refine(
    (data) =>
      !data.payers ||
      Math.abs(
        data.payers.reduce((sum, payer) => sum + payer.amount, 0) - data.amount,
      ) < 0.01,
    {
      message: 'La suma de los pagadores debe ser igual al monto total',
      path: ['payers'],
    },
  );

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

export const searchGroupMembersQuerySchema = z.object({
  query: z.string().trim().min(1).max(120),
});

export const groupImageSchema = z.object({
  dataUrl: z.string().min(1).max(15_000_000),
  fileName: z.string().min(1).max(200).optional(),
});

export const groupCategorySchema = z.object({
  name: z.string().min(1).max(120),
  icon: z.string().min(1).max(32).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const updateGroupCategorySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    icon: z.string().min(1).max(32).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.icon !== undefined ||
      data.color !== undefined,
    {
      message: 'Debes enviar al menos un campo',
    },
  );

export const moveGroupCategoryExpensesSchema = z.object({
  targetCategoryId: z.string().min(1).nullable().optional(),
});

export const createGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(60),
  description: z.string().max(400).optional(),
  image: groupImageSchema.optional(),
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

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(60),
  description: z.string().max(400).optional(),
  image: groupImageSchema.optional(),
});

export const updateGroupSettingsSchema = z.object({
  advancedExpenseDetailsEnabled: z.boolean().optional(),
});

export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>;
