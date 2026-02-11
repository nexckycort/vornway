/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const UpdateProfileNameInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

interface UpdateProfileNameResponse {
  success: boolean;
  name?: string;
  error?: string;
}

export const updateProfileName = createServerFn({ method: 'POST' })
  .inputValidator(UpdateProfileNameInputSchema)
  .handler(async ({ data }): Promise<UpdateProfileNameResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      const name = data.name.trim();
      if (!name) {
        return {
          success: false,
          error: 'El nombre es requerido',
        };
      }

      await db.user.update({
        where: {
          id: userId,
        },
        data: {
          name,
        },
      });

      await session.update({
        userId,
        email: session.data.email,
        name,
      });

      return {
        success: true,
        name,
      };
    } catch (error) {
      console.error('Error updating profile name:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el nombre',
      };
    }
  });
