import { AppError } from '#/shared/errors/app-error';

export function feedbackCreateError(cause: unknown) {
  return new AppError({
    status: 400,
    code: 'FEEDBACK_CREATE_FAILED',
    message: 'No se pudo crear el reporte',
    cause,
  });
}

export function feedbackListError(cause: unknown) {
  return new AppError({
    status: 500,
    code: 'FEEDBACK_LIST_FAILED',
    message: 'No se pudieron listar los reportes',
    cause,
  });
}

export function feedbackNotFoundError() {
  return new AppError({
    status: 404,
    code: 'FEEDBACK_NOT_FOUND',
    message: 'Reporte no encontrado',
  });
}

export function feedbackDeleteError(cause: unknown) {
  return new AppError({
    status: 400,
    code: 'FEEDBACK_DELETE_FAILED',
    message: 'No se pudo eliminar el reporte',
    cause,
  });
}
