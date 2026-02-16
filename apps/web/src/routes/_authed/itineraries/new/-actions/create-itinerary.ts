/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db } from '~/infrastructure/database/connection';
import { buildDateRange } from '~/lib/itinerary-utils';
import { useAppSession } from '~/utils/session';

const CreateItineraryInputSchema = z.object({
  city: z.string().min(2),
  country: z.string().min(2),
  startDate: z.string(),
  endDate: z.string(),
});

interface CreateItineraryResponse {
  success: boolean;
  itineraryId?: string;
  error?: string;
}

export const createItinerary = createServerFn({ method: 'POST' })
  .inputValidator(CreateItineraryInputSchema)
  .handler(async ({ data }): Promise<CreateItineraryResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return { success: false, error: 'Fechas inválidas' };
      }

      if (endDate < startDate) {
        return {
          success: false,
          error: 'La fecha fin debe ser mayor o igual a la fecha inicio',
        };
      }

      const days = buildDateRange(startDate, endDate);
      if (days.length > 30) {
        return {
          success: false,
          error: 'El MVP permite itinerarios de hasta 30 días',
        };
      }

      const itinerary = await db.$transaction(async (tx) => {
        const created = await tx.itinerary.create({
          data: {
            userId,
            city: data.city.trim(),
            country: data.country.trim(),
            startDate,
            endDate,
          },
          select: { id: true },
        });

        await tx.itineraryDay.createMany({
          data: days.map((date, index) => ({
            itineraryId: created.id,
            dayNumber: index + 1,
            date,
          })),
        });

        return created;
      });

      return {
        success: true,
        itineraryId: itinerary.id,
      };
    } catch (error) {
      console.error('Error creating itinerary:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo crear el itinerario',
      };
    }
  });
