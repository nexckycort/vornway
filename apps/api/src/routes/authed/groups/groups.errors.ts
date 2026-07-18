import type { Context } from 'hono';

import { AppError } from '#/shared/errors/app-error';

export const groupErrors = {
  notFound: () =>
    new AppError({
      status: 404,
      code: 'GROUP_NOT_FOUND',
      message: 'Grupo no encontrado',
    }),
  editForbidden: () =>
    new AppError({
      status: 403,
      code: 'GROUP_EDIT_FORBIDDEN',
      message: 'No tienes permiso para editar el grupo',
    }),
  accessDenied: () =>
    new AppError({
      status: 400,
      code: 'GROUP_ACCESS_DENIED',
      message: 'No tienes acceso a este grupo',
    }),
  categoryNameRequired: () =>
    new AppError({
      status: 400,
      code: 'GROUP_CATEGORY_NAME_REQUIRED',
      message: 'El nombre de la categoría es obligatorio',
    }),
  categoryNotFound: () =>
    new AppError({
      status: 404,
      code: 'GROUP_CATEGORY_NOT_FOUND',
      message: 'Categoría no encontrada',
    }),
  categoryNameConflict: () =>
    new AppError({
      status: 409,
      code: 'GROUP_CATEGORY_NAME_CONFLICT',
      message: 'Ya existe una categoría con ese nombre',
    }),
  categoryHasExpenses: () =>
    new AppError({
      status: 409,
      code: 'GROUP_CATEGORY_HAS_EXPENSES',
      message: 'La categoría tiene gastos asociados',
    }),
  categoryTargetSame: () =>
    new AppError({
      status: 400,
      code: 'GROUP_CATEGORY_TARGET_SAME',
      message: 'La categoría destino debe ser diferente',
    }),
  categoryTargetNotFound: () =>
    new AppError({
      status: 404,
      code: 'GROUP_CATEGORY_TARGET_NOT_FOUND',
      message: 'Categoría destino no encontrada',
    }),
  memberNotFound: () =>
    new AppError({
      status: 400,
      code: 'GROUP_MEMBER_NOT_FOUND',
      message: 'Participante no encontrado',
    }),
  memberRemoveForbidden: () =>
    new AppError({
      status: 400,
      code: 'GROUP_MEMBER_REMOVE_FORBIDDEN',
      message: 'Solo el creador puede eliminar participantes',
    }),
  ownerRemoveForbidden: () =>
    new AppError({
      status: 400,
      code: 'GROUP_OWNER_REMOVE_FORBIDDEN',
      message: 'No puedes eliminar al creador del grupo',
    }),
  memberHasExpenses: () =>
    new AppError({
      status: 400,
      code: 'GROUP_MEMBER_HAS_EXPENSES',
      message: 'El participante ya tiene gastos',
    }),
  memberUnlinkForbidden: () =>
    new AppError({
      status: 400,
      code: 'GROUP_MEMBER_UNLINK_FORBIDDEN',
      message: 'Solo el creador puede desvincular participantes',
    }),
  memberAlreadyUnlinked: () =>
    new AppError({
      status: 400,
      code: 'GROUP_MEMBER_ALREADY_UNLINKED',
      message: 'El participante ya no tiene una cuenta vinculada',
    }),
  ownerUnlinkForbidden: () =>
    new AppError({
      status: 400,
      code: 'GROUP_OWNER_UNLINK_FORBIDDEN',
      message: 'No puedes desvincular al creador del grupo',
    }),
  expenseNotFound: () =>
    new AppError({
      status: 404,
      code: 'GROUP_EXPENSE_NOT_FOUND',
      message: 'Gasto no encontrado',
    }),
  expenseIdConflict: () =>
    new AppError({
      status: 400,
      code: 'GROUP_EXPENSE_ID_CONFLICT',
      message: 'El identificador del gasto ya existe',
    }),
  expensePayerInvalid: () =>
    new AppError({
      status: 400,
      code: 'GROUP_EXPENSE_PAYER_INVALID',
      message: 'El pagador no pertenece al grupo',
    }),
  expenseCategoryInvalid: () =>
    new AppError({
      status: 400,
      code: 'GROUP_EXPENSE_CATEGORY_INVALID',
      message: 'La categoría no pertenece al grupo',
    }),
  expenseParticipantsInvalid: () =>
    new AppError({
      status: 400,
      code: 'GROUP_EXPENSE_PARTICIPANTS_INVALID',
      message: 'El desglose contiene participantes inválidos',
    }),
  expenseLineItemsInvalid: () =>
    new AppError({
      status: 400,
      code: 'GROUP_EXPENSE_LINE_ITEMS_INVALID',
      message: 'No se pudo relacionar el desglose con sus participantes',
    }),
  expenseDeleted: () =>
    new AppError({
      status: 400,
      code: 'GROUP_EXPENSE_DELETED',
      message: 'No puedes editar un gasto eliminado',
    }),
  settlementParticipantsInvalid: () =>
    new AppError({
      status: 400,
      code: 'GROUP_SETTLEMENT_PARTICIPANTS_INVALID',
      message: 'Participantes de liquidación inválidos',
    }),
};

export function groupRouteErrorResponse(c: Context, error: unknown) {
  if (error instanceof AppError) {
    return c.json({ error: error.message }, error.status);
  }

  throw error;
}

export function groupRouteBadRequestErrorResponse(c: Context, error: unknown) {
  if (error instanceof AppError) {
    return c.json({ error: error.message }, 400);
  }

  throw error;
}
