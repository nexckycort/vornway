import { AppError } from '#/shared/errors/app-error';

export function userNotFoundError() {
  return new AppError({
    status: 404,
    code: 'USER_NOT_FOUND',
    message: 'Usuario no encontrado',
  });
}

export function userSearchError(cause: unknown) {
  return new AppError({
    status: 500,
    code: 'USER_SEARCH_FAILED',
    message: 'No se pudo buscar usuarios',
    cause,
  });
}

export function userImageUploadError(cause: unknown) {
  return new AppError({
    status: 400,
    code: 'USER_IMAGE_UPLOAD_FAILED',
    message: 'No se pudo subir la imagen',
    cause,
  });
}

export function userImageUpdateError(cause: unknown) {
  return new AppError({
    status: 500,
    code: 'USER_IMAGE_UPDATE_FAILED',
    message: 'No se pudo actualizar la imagen del usuario',
    cause,
  });
}

export function usernameAlreadyTakenError() {
  return new AppError({
    status: 409,
    code: 'USERNAME_ALREADY_TAKEN',
    message: 'Ese nombre de usuario ya esta en uso',
  });
}

export function usernameUpdateError(cause: unknown) {
  return new AppError({
    status: 500,
    code: 'USERNAME_UPDATE_FAILED',
    message: 'No se pudo actualizar el nombre de usuario',
    cause,
  });
}
