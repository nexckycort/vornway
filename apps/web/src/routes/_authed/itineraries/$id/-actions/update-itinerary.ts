/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { buildDateRange } from '~/lib/itinerary-utils';
import { useAppSession } from '~/utils/session';

const UpdateItineraryInputSchema = z.object({
  itineraryId: z.string(),
  city: z.string().min(2),
  country: z.string().min(2),
  startDate: z.string(),
  endDate: z.string(),
});

interface UpdateItineraryResponse {
  success: boolean;
  error?: string;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const updateItinerary = createServerFn({ method: 'POST' })
  .inputValidator(UpdateItineraryInputSchema)
  .handler(async ({ data }): Promise<UpdateItineraryResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        return { success: false, error: 'Fechas inválidas' };
      }

      if (endDate < startDate) {
        return {
          success: false,
          error: 'La fecha fin debe ser mayor o igual a la fecha inicio',
        };
      }

      const desiredDates = buildDateRange(startDate, endDate);
      if (desiredDates.length > 30) {
        return {
          success: false,
          error: 'El MVP permite itinerarios de hasta 30 días',
        };
      }

      const itinerary = await db.itinerary.findUnique({
        where: { id: data.itineraryId },
        select: {
          id: true,
          userId: true,
          days: {
            select: {
              id: true,
              date: true,
            },
          },
        },
      });

      if (!itinerary) {
        return { success: false, error: 'Itinerario no encontrado' };
      }

      if (itinerary.userId !== userId) {
        return { success: false, error: 'No tienes acceso a este itinerario' };
      }

      const existingByDate = new Map(
        itinerary.days.map((day) => [toDateKey(day.date), day.id]),
      );

      await db.$transaction(async (tx) => {
        await tx.itinerary.update({
          where: { id: itinerary.id },
          data: {
            city: data.city.trim(),
            country: data.country.trim(),
            startDate,
            endDate,
          },
        });

        const keepDayIds = new Set<string>();

        for (let index = 0; index < desiredDates.length; index += 1) {
          const date = desiredDates[index];
          const dayNumber = index + 1;
          const key = toDateKey(date);
          const existingId = existingByDate.get(key);

          if (existingId) {
            keepDayIds.add(existingId);
            await tx.itineraryDay.update({
              where: { id: existingId },
              data: {
                dayNumber,
                date,
              },
            });
            continue;
          }

          const created = await tx.itineraryDay.create({
            data: {
              itineraryId: itinerary.id,
              dayNumber,
              date,
            },
            select: { id: true },
          });
          keepDayIds.add(created.id);
        }

        const toDelete = itinerary.days
          .map((day) => day.id)
          .filter((dayId) => !keepDayIds.has(dayId));

        if (toDelete.length > 0) {
          await tx.itineraryDay.deleteMany({
            where: {
              id: {
                in: toDelete,
              },
            },
          });
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating itinerary:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el itinerario',
      };
    }
  });
