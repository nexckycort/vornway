import type { Context } from 'hono';

import { AppError } from '#/shared/errors/app-error';

export const goalErrors = {
  notFound: () =>
    new AppError({
      status: 404,
      code: 'GOAL_NOT_FOUND',
      message: 'Meta no encontrada',
    }),
  nameRequired: () =>
    new AppError({
      status: 400,
      code: 'GOAL_NAME_REQUIRED',
      message: 'El nombre de la meta es obligatorio',
    }),
  targetAmountInvalid: () =>
    new AppError({
      status: 400,
      code: 'GOAL_TARGET_AMOUNT_INVALID',
      message: 'El monto objetivo debe ser mayor a 0',
    }),
  installmentsInvalid: () =>
    new AppError({
      status: 400,
      code: 'GOAL_INSTALLMENTS_INVALID',
      message: 'Las cuotas deben ser mayores a 0',
    }),
  monthlyInstallmentInvalid: () =>
    new AppError({
      status: 400,
      code: 'GOAL_MONTHLY_INSTALLMENT_INVALID',
      message: 'La cuota mensual debe ser mayor a 0',
    }),
  contributionAmountInvalid: () =>
    new AppError({
      status: 400,
      code: 'GOAL_CONTRIBUTION_AMOUNT_INVALID',
      message: 'El aporte debe ser mayor a 0',
    }),
  accessDenied: () =>
    new AppError({
      status: 403,
      code: 'GOAL_ACCESS_DENIED',
      message: 'No tienes acceso a esta meta',
    }),
  contributionCreateForbidden: () =>
    new AppError({
      status: 403,
      code: 'GOAL_CONTRIBUTION_CREATE_FORBIDDEN',
      message: 'Solo un admin puede registrar aportes',
    }),
  contributionDeleteForbidden: () =>
    new AppError({
      status: 403,
      code: 'GOAL_CONTRIBUTION_DELETE_FORBIDDEN',
      message: 'Solo un admin puede eliminar aportes',
    }),
  participantInvalid: () =>
    new AppError({
      status: 400,
      code: 'GOAL_PARTICIPANT_INVALID',
      message: 'Participante inválido',
    }),
  contributionNotFound: () =>
    new AppError({
      status: 404,
      code: 'GOAL_CONTRIBUTION_NOT_FOUND',
      message: 'Aporte no encontrado',
    }),
  amountAndInstallmentsInvalid: () =>
    new AppError({
      status: 400,
      code: 'GOAL_AMOUNT_AND_INSTALLMENTS_INVALID',
      message: 'Monto objetivo y cuotas deben ser mayores a 0',
    }),
};

export function goalRouteErrorResponse(c: Context, error: unknown) {
  if (error instanceof AppError) {
    return c.json({ error: error.message }, error.status);
  }

  throw error;
}
