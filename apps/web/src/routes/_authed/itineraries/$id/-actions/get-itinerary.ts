/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db } from '~/infrastructure/database/connection';
import {
  detectClosedWarning,
  estimateTravelMinutes,
  formatDistanceKm,
  haversineDistanceKm,
  toTransportMode,
} from '~/lib/itinerary-utils';
import { useAppSession } from '~/utils/session';

const GetItineraryInputSchema = z.object({
  itineraryId: z.string(),
});

interface ItineraryPlaceView {
  id: string;
  name: string;
  type: string;
  imageUrl: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  ticketRequired: boolean;
  price: number | null;
  visitDurationMinutes: number;
  orderIndex: number;
  distanceFromPreviousKm: number;
  distanceFromPreviousLabel: string;
  travelMinutesFromPrevious: number;
  closedWarning: string | null;
}

interface GetItineraryResponse {
  success: boolean;
  itinerary?: {
    id: string;
    city: string;
    country: string;
    startDate: Date;
    endDate: Date;
    dayCount: number;
    days: Array<{
      id: string;
      dayNumber: number;
      date: Date;
      transportMode: string;
      totalDistanceKm: number;
      totalTravelMinutes: number;
      places: ItineraryPlaceView[];
      notes: string;
      checklistItems: Array<{
        id: string;
        item: string;
        completed: boolean;
        orderIndex: number;
      }>;
    }>;
  };
  error?: string;
}

export const getItinerary = createServerFn({ method: 'POST' })
  .inputValidator(GetItineraryInputSchema)
  .handler(async ({ data }): Promise<GetItineraryResponse> => {
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
          city: true,
          country: true,
          startDate: true,
          endDate: true,
          userId: true,
          days: {
            select: {
              id: true,
              dayNumber: true,
              date: true,
              transportMode: true,
              places: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  imageUrl: true,
                  description: true,
                  latitude: true,
                  longitude: true,
                  openingHours: true,
                  ticketRequired: true,
                  price: true,
                  visitDurationMinutes: true,
                  orderIndex: true,
                },
                orderBy: { orderIndex: 'asc' },
              },
              note: {
                select: {
                  content: true,
                },
              },
              checklistItems: {
                select: {
                  id: true,
                  item: true,
                  completed: true,
                  orderIndex: true,
                },
                orderBy: { orderIndex: 'asc' },
              },
            },
            orderBy: { dayNumber: 'asc' },
          },
        },
      });

      if (!itinerary) {
        return { success: false, error: 'Itinerario no encontrado' };
      }

      if (itinerary.userId !== userId) {
        return { success: false, error: 'No tienes acceso a este itinerario' };
      }

      return {
        success: true,
        itinerary: {
          id: itinerary.id,
          city: itinerary.city,
          country: itinerary.country,
          startDate: itinerary.startDate,
          endDate: itinerary.endDate,
          dayCount: itinerary.days.length,
          days: itinerary.days.map((day) => {
            const transportMode = toTransportMode(day.transportMode);
            let totalDistanceKm = 0;
            let totalTravelMinutes = 0;

            const places: ItineraryPlaceView[] = day.places.map((place, index) => {
              if (index === 0) {
                return {
                  ...place,
                  distanceFromPreviousKm: 0,
                  distanceFromPreviousLabel: 'Inicio',
                  travelMinutesFromPrevious: 0,
                  closedWarning: detectClosedWarning(place.openingHours, day.date),
                };
              }

              const previous = day.places[index - 1];
              const distanceKm = haversineDistanceKm(
                previous.latitude,
                previous.longitude,
                place.latitude,
                place.longitude,
              );
              const travelMinutes = estimateTravelMinutes(distanceKm, transportMode);

              totalDistanceKm += distanceKm;
              totalTravelMinutes += travelMinutes;

              return {
                ...place,
                distanceFromPreviousKm: distanceKm,
                distanceFromPreviousLabel: formatDistanceKm(distanceKm),
                travelMinutesFromPrevious: travelMinutes,
                closedWarning: detectClosedWarning(place.openingHours, day.date),
              };
            });

            return {
              id: day.id,
              dayNumber: day.dayNumber,
              date: day.date,
              transportMode,
              totalDistanceKm,
              totalTravelMinutes,
              places,
              notes: day.note?.content ?? '',
              checklistItems: day.checklistItems,
            };
          }),
        },
      };
    } catch (error) {
      console.error('Error getting itinerary:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el itinerario',
      };
    }
  });
