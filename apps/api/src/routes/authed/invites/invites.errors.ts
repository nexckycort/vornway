import type { Context } from 'hono';

import { AppError } from '#/shared/errors/app-error';

export const inviteErrors = {
  groupNotFound: () =>
    new AppError({
      status: 404,
      code: 'INVITE_GROUP_NOT_FOUND',
      message: 'Grupo no encontrado',
    }),
  memberNotFound: () =>
    new AppError({
      status: 400,
      code: 'INVITE_MEMBER_NOT_FOUND',
      message: 'Miembro no encontrado',
    }),
  memberAlreadyLinked: () =>
    new AppError({
      status: 400,
      code: 'INVITE_MEMBER_ALREADY_LINKED',
      message: 'Ese participante ya tiene una cuenta asociada',
    }),
};

export function inviteRouteErrorResponse(c: Context, error: unknown) {
  if (error instanceof AppError) {
    return c.json({ error: error.message }, error.status);
  }

  throw error;
}
