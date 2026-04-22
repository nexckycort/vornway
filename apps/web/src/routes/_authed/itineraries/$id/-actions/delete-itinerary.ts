/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const DeleteItineraryInputSchema = z.object({
  itineraryId: z.string(),
});

interface DeleteItineraryResponse {
  success: boolean;
  error?: string;
}

export const deleteItinerary = createServerFn({ method: 'POST' })
  .inputValidator(DeleteItineraryInputSchema)
  .handler(async ({ data }): Promise<DeleteItineraryResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const itinerary = await db.itinerary.findUnique({
        where: { id: data.itineraryId },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!itinerary) {
        return { success: false, error: 'Itinerario no encontrado' };
      }

      if (itinerary.userId !== userId) {
        return { success: false, error: 'No tienes acceso a este itinerario' };
      }

      await db.itinerary.delete({
        where: {
          id: itinerary.id,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting itinerary:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el itinerario',
      };
    }
  });
