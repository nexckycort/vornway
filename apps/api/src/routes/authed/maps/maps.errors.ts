import type { Context } from 'hono';

import { AppError } from '#/shared/errors/app-error';

export const mapErrors = {
  googleMapsOnly: () =>
    new AppError({
      status: 400,
      code: 'GOOGLE_MAPS_ONLY',
      message: 'Solo se permiten enlaces de Google Maps',
    }),
};

export function mapRouteErrorResponse(c: Context, error: unknown) {
  if (error instanceof AppError) {
    return c.json({ error: error.message }, error.status);
  }

  throw error;
}
