import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createGroupsService } from '#/modules/groups/service';
import type { AppContext } from '#/shared/types/app';
import {
  addGroupMemberSchema,
  createGroupExpenseSchema,
  createGroupSchema,
  groupCategoryParamsSchema,
  groupCategorySchema,
  groupExpenseParamsSchema,
  groupImageSchema,
  groupMemberActionQuerySchema,
  groupMemberParamsSchema,
  groupParamsSchema,
  groupReportsCategoryCountQuerySchema,
  groupReportsTotalsQuerySchema,
  listGroupExpensesQuerySchema,
  listGroupMemberExpensesQuerySchema,
  listGroupsQuerySchema,
  moveGroupCategoryExpensesSchema,
  searchGroupMembersQuerySchema,
  settleGroupDebtSchema,
  updateGroupCategorySchema,
  updateGroupSchema,
  updateGroupSettingsSchema,
} from './groups.validators';

const groupsService = createGroupsService();

const groups = new Hono<AppContext>()
  .post('/', zValidator('json', createGroupSchema), async (c) => {
    const data = c.req.valid('json');
    const { id: userId, name, email } = c.get('user');

    const group = await groupsService.createGroup({
      id: data.id,
      userId,
      ownerName: name?.trim() || email || 'Usuario',
      name: data.name,
      type: data.type,
      description: data.description,
      image: data.image,
      participants: data.participants,
    });

    return c.json(group, 201);
  })
  .get('/', zValidator('query', listGroupsQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const result = await groupsService.listGroups({
      userId,
      limit: query.limit,
      cursor: query.cursor,
      search: query.search,
      filter: query.filter,
    });

    return c.json(result);
  })
  .get('/:id', zValidator('param', groupParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await groupsService.getGroupSummary({
        userId,
        groupId: id,
      });
      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Grupo no encontrado') {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  })
  .get('/:id/export', zValidator('param', groupParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await groupsService.exportGroupCsv({
        userId,
        groupId: id,
      });

      return c.body(result.content, 200, {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Cache-Control': 'no-store',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Grupo no encontrado') {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  })
  .delete('/:id', zValidator('param', groupParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await groupsService.deleteGroup({
        userId,
        groupId: id,
      });
      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Grupo no encontrado') {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  })
  .patch(
    '/:id',
    zValidator('param', groupParamsSchema),
    zValidator('json', updateGroupSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.updateGroup({
          userId,
          groupId: id,
          name: data.name,
          type: data.type,
          description: data.description,
          image: data.image,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'No tienes permiso para editar el grupo') {
            return c.json({ error: error.message }, 403);
          }
        }

        throw error;
      }
    },
  )
  .patch(
    '/:id/settings',
    zValidator('param', groupParamsSchema),
    zValidator('json', updateGroupSettingsSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.updateGroupSettings({
          userId,
          groupId: id,
          advancedExpenseDetailsEnabled: data.advancedExpenseDetailsEnabled,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Grupo no encontrado') {
          return c.json({ error: error.message }, 404);
        }

        throw error;
      }
    },
  )
  .patch(
    '/:id/image',
    zValidator('param', groupParamsSchema),
    zValidator('json', groupImageSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.updateGroupImage({
          userId,
          groupId: id,
          image: data,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Grupo no encontrado') {
          return c.json({ error: error.message }, 404);
        }

        throw error;
      }
    },
  )
  .post(
    '/:id/categories',
    zValidator('param', groupParamsSchema),
    zValidator('json', groupCategorySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.createCategory({
          userId,
          groupId: id,
          name: data.name,
          icon: data.icon,
          color: data.color,
        });

        return c.json(result, 201);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'Solo el creador puede crear categorías') {
            return c.json({ error: error.message }, 403);
          }
          return c.json({ error: error.message }, 400);
        }

        throw error;
      }
    },
  )
  .patch(
    '/:id/categories/:categoryId',
    zValidator('param', groupCategoryParamsSchema),
    zValidator('json', updateGroupCategorySchema),
    async (c) => {
      const { id, categoryId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.updateCategory({
          userId,
          groupId: id,
          categoryId,
          name: data.name,
          icon: data.icon,
          color: data.color,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'Categoría no encontrada') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'El nombre de la categoría es obligatorio') {
            return c.json({ error: error.message }, 400);
          }
          if (error.message === 'Ya existe una categoría con ese nombre') {
            return c.json({ error: error.message }, 409);
          }
        }

        throw error;
      }
    },
  )
  .delete(
    '/:id/categories/:categoryId',
    zValidator('param', groupCategoryParamsSchema),
    async (c) => {
      const { id, categoryId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.deleteCategory({
          userId,
          groupId: id,
          categoryId,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'Categoría no encontrada') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'La categoría tiene gastos asociados') {
            return c.json({ error: error.message }, 409);
          }
        }

        throw error;
      }
    },
  )
  .post(
    '/:id/categories/:categoryId/move-expenses',
    zValidator('param', groupCategoryParamsSchema),
    zValidator('json', moveGroupCategoryExpensesSchema),
    async (c) => {
      const { id, categoryId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.moveCategoryExpenses({
          userId,
          groupId: id,
          categoryId,
          targetCategoryId: data.targetCategoryId,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'Categoría no encontrada') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'Categoría destino no encontrada') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'La categoría destino debe ser diferente') {
            return c.json({ error: error.message }, 400);
          }
        }

        throw error;
      }
    },
  )
  .get(
    '/:id/expenses',
    zValidator('param', groupParamsSchema),
    zValidator('query', listGroupExpensesQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.listGroupExpenses({
          userId,
          groupId: id,
          limit: query.limit,
          cursor: query.cursor,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Grupo no encontrado') {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  )
  .get(
    '/:id/members/:memberId/expenses',
    zValidator('param', groupMemberParamsSchema),
    zValidator('query', listGroupMemberExpensesQuerySchema),
    async (c) => {
      const { id, memberId } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.listGroupMemberExpenses({
          userId,
          groupId: id,
          memberId,
          limit: query.limit,
          cursor: query.cursor,
          categoryId: query.categoryId,
          uncategorized: query.uncategorized,
          paidOnly: query.paidOnly,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'Participante no encontrado') {
            return c.json({ error: error.message }, 404);
          }
        }
        throw error;
      }
    },
  )
  .get(
    '/:id/expenses/:expenseId',
    zValidator('param', groupExpenseParamsSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.getGroupExpense({
          userId,
          groupId: id,
          expenseId,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'Gasto no encontrado') {
            return c.json({ error: error.message }, 404);
          }
        }
        throw error;
      }
    },
  )
  .get(
    '/:id/reports/totals',
    zValidator('param', groupParamsSchema),
    zValidator('query', groupReportsTotalsQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.getGroupReportsTotals({
          userId,
          groupId: id,
          range: query.range,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Grupo no encontrado') {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  )
  .get(
    '/:id/reports/category-count',
    zValidator('param', groupParamsSchema),
    zValidator('query', groupReportsCategoryCountQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.getGroupReportsCategoryCount({
          userId,
          groupId: id,
          range: query.range,
          startDate: query.startDate,
          endDate: query.endDate,
          categoryId: query.categoryId,
          uncategorized: query.uncategorized,
          currency: query.currency,
          participantIds: query.participantIds
            ?.split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Grupo no encontrado') {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  )
  .get(
    '/:id/reports/balances',
    zValidator('param', groupParamsSchema),
    zValidator('query', groupReportsTotalsQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.getGroupReportsBalances({
          userId,
          groupId: id,
          range: query.range,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Grupo no encontrado') {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  )
  .get(
    '/:id/reports/shares',
    zValidator('param', groupParamsSchema),
    zValidator('query', groupReportsTotalsQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.getGroupReportsShares({
          userId,
          groupId: id,
          range: query.range,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Grupo no encontrado') {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  )
  .post(
    '/:id/expenses',
    zValidator('param', groupParamsSchema),
    zValidator('json', createGroupExpenseSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.createExpense({
          userId,
          groupId: id,
          id: data.id,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          categoryId: data.categoryId,
          paidById: data.paidById,
          paidByIds: data.paidByIds,
          payers: data.payers,
          participantIds: data.participantIds,
          splitMethod: data.splitMethod,
          exactShares: data.exactShares,
          lineItems: data.lineItems,
          sharedSplit: data.sharedSplit,
          attachmentImage: data.attachmentImage,
          advancedDetails: data.advancedDetails,
        });
        return c.json(result, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  )
  .put(
    '/:id/expenses/:expenseId',
    zValidator('param', groupExpenseParamsSchema),
    zValidator('json', createGroupExpenseSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.updateExpense({
          userId,
          groupId: id,
          expenseId,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          categoryId: data.categoryId,
          paidById: data.paidById,
          paidByIds: data.paidByIds,
          payers: data.payers,
          participantIds: data.participantIds,
          splitMethod: data.splitMethod,
          exactShares: data.exactShares,
          lineItems: data.lineItems,
          sharedSplit: data.sharedSplit,
          attachmentImage: data.attachmentImage,
          advancedDetails: data.advancedDetails,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  )
  .delete(
    '/:id/expenses/:expenseId',
    zValidator('param', groupExpenseParamsSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.deleteExpense({
          userId,
          groupId: id,
          expenseId,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  )
  .post(
    '/:id/settlements',
    zValidator('param', groupParamsSchema),
    zValidator('json', settleGroupDebtSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.settleDebt({
          userId,
          groupId: id,
          fromMemberId: data.fromMemberId,
          toMemberId: data.toMemberId,
          amount: data.amount,
          currency: data.currency,
        });
        return c.json(result, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  )
  .get(
    '/:id/members/search',
    zValidator('param', groupParamsSchema),
    zValidator('query', searchGroupMembersQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { query } = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.searchMembers({
          userId,
          groupId: id,
          query,
        });

        return c.json(result);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'No tienes acceso a este grupo'
        ) {
          return c.json({ error: error.message }, 400);
        }

        throw error;
      }
    },
  )
  .post(
    '/:id/members',
    zValidator('param', groupParamsSchema),
    zValidator('json', addGroupMemberSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.addMember({
          userId,
          groupId: id,
          name: data.name,
          linkedUserId: data.linkedUserId,
        });
        return c.json(result, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  )
  .delete(
    '/:id/members/:memberId',
    zValidator('param', groupMemberParamsSchema),
    zValidator('query', groupMemberActionQuerySchema),
    async (c) => {
      const { id, memberId } = c.req.valid('param');
      const { unlink } = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        if (unlink) {
          const result = await groupsService.unlinkMember({
            userId,
            groupId: id,
            memberId,
          });
          return c.json(result);
        }

        const result = await groupsService.removeMember({
          userId,
          groupId: id,
          memberId,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  );

export default groups;
