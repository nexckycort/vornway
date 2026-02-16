import { createServerFn } from '@tanstack/react-start';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

interface UserItinerary {
  id: string;
  city: string;
  country: string;
  startDate: Date;
  endDate: Date;
  dayCount: number;
  createdAt: Date;
}

interface GetUserItinerariesResponse {
  success: boolean;
  itineraries: UserItinerary[];
  error?: string;
}

export const getUserItineraries = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GetUserItinerariesResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          itineraries: [],
          error: 'No autenticado',
        };
      }

      const itineraries = await db.itinerary.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
          city: true,
          country: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          _count: {
            select: {
              days: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        itineraries: itineraries.map((itinerary) => ({
          id: itinerary.id,
          city: itinerary.city,
          country: itinerary.country,
          startDate: itinerary.startDate,
          endDate: itinerary.endDate,
          createdAt: itinerary.createdAt,
          dayCount: itinerary._count.days,
        })),
      };
    } catch (error) {
      console.error('Error fetching user itineraries:', error);
      return {
        success: false,
        itineraries: [],
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener los itinerarios',
      };
    }
  },
);
