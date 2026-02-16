/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db } from '~/infrastructure/database/connection';
import { getPopularPlacesForCity } from '~/lib/itinerary-popular-places';
import {
  detectClosedWarning,
  optimizePlacesByDistance,
  toTransportMode,
} from '~/lib/itinerary-utils';
import { useAppSession } from '~/utils/session';

const UpdateItineraryDayInputSchema = z.object({
  itineraryId: z.string(),
  dayId: z.string().optional(),
  operation: z.enum([
    'add-day',
    'delete-day',
    'set-transport',
    'save-notes',
    'add-place',
    'update-place',
    'delete-place',
    'reorder-places',
    'autocomplete-day',
    'optimize-day-route',
    'add-checklist-item',
    'update-checklist-item',
    'toggle-checklist-item',
    'delete-checklist-item',
  ]),
  payload: z.any().optional(),
});

type UpdateOperation = z.infer<typeof UpdateItineraryDayInputSchema>['operation'];

interface UpdateItineraryDayResponse {
  success: boolean;
  message?: string;
  warnings?: string[];
  error?: string;
}

async function assertOwner(itineraryId: string, userId: string) {
  const itinerary = await db.itinerary.findUnique({
    where: { id: itineraryId },
    select: {
      id: true,
      userId: true,
      city: true,
      country: true,
    },
  });

  if (!itinerary) {
    throw new Error('Itinerario no encontrado');
  }

  if (itinerary.userId !== userId) {
    throw new Error('No tienes acceso a este itinerario');
  }

  return itinerary;
}

async function assertDayBelongs(itineraryId: string, dayId: string) {
  const day = await db.itineraryDay.findFirst({
    where: {
      id: dayId,
      itineraryId,
    },
    select: {
      id: true,
      dayNumber: true,
      date: true,
      transportMode: true,
    },
  });

  if (!day) {
    throw new Error('Día no encontrado');
  }

  return day;
}

async function recalculateDayNumbers(itineraryId: string) {
  const days = await db.itineraryDay.findMany({
    where: { itineraryId },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });

  for (let index = 0; index < days.length; index += 1) {
    await db.itineraryDay.update({
      where: { id: days[index].id },
      data: { dayNumber: index + 1 },
    });
  }
}

export const updateItineraryDay = createServerFn({ method: 'POST' })
  .inputValidator(UpdateItineraryDayInputSchema)
  .handler(async ({ data }): Promise<UpdateItineraryDayResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const itinerary = await assertOwner(data.itineraryId, userId);

      switch (data.operation as UpdateOperation) {
        case 'add-day': {
          const lastDay = await db.itineraryDay.findFirst({
            where: { itineraryId: itinerary.id },
            orderBy: { dayNumber: 'desc' },
            select: {
              dayNumber: true,
              date: true,
            },
          });

          if (!lastDay) {
            return { success: false, error: 'No se encontraron días base' };
          }

          const date = new Date(lastDay.date);
          date.setDate(date.getDate() + 1);

          await db.itineraryDay.create({
            data: {
              itineraryId: itinerary.id,
              dayNumber: lastDay.dayNumber + 1,
              date,
            },
          });

          await db.itinerary.update({
            where: { id: itinerary.id },
            data: { endDate: date },
          });

          return { success: true, message: 'Día agregado' };
        }

        case 'delete-day': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          const dayCount = await db.itineraryDay.count({
            where: { itineraryId: itinerary.id },
          });

          if (dayCount <= 1) {
            return {
              success: false,
              error: 'Debe existir al menos un día en el itinerario',
            };
          }

          await assertDayBelongs(itinerary.id, data.dayId);

          await db.itineraryDay.delete({
            where: { id: data.dayId },
          });

          await recalculateDayNumbers(itinerary.id);

          const firstAndLast = await db.itineraryDay.findMany({
            where: { itineraryId: itinerary.id },
            orderBy: { date: 'asc' },
            select: { date: true },
          });

          await db.itinerary.update({
            where: { id: itinerary.id },
            data: {
              startDate: firstAndLast[0].date,
              endDate: firstAndLast[firstAndLast.length - 1].date,
            },
          });

          return { success: true, message: 'Día eliminado' };
        }

        case 'set-transport': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }
          const transportMode = toTransportMode(
            String(data.payload?.transportMode ?? 'walking'),
          );

          await assertDayBelongs(itinerary.id, data.dayId);
          await db.itineraryDay.update({
            where: { id: data.dayId },
            data: { transportMode },
          });

          return { success: true, message: 'Transporte actualizado' };
        }

        case 'save-notes': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          const content = String(data.payload?.content ?? '').trim();
          await assertDayBelongs(itinerary.id, data.dayId);

          await db.itineraryNote.upsert({
            where: { dayId: data.dayId },
            create: {
              dayId: data.dayId,
              content,
            },
            update: {
              content,
            },
          });

          return { success: true, message: 'Notas guardadas' };
        }

        case 'add-place': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          await assertDayBelongs(itinerary.id, data.dayId);

          const maxOrder = await db.itineraryPlace.aggregate({
            where: { dayId: data.dayId },
            _max: { orderIndex: true },
          });

          await db.itineraryPlace.create({
            data: {
              dayId: data.dayId,
              name: String(data.payload?.name ?? 'Lugar sin nombre'),
              type: String(data.payload?.type ?? 'Lugar'),
              imageUrl: data.payload?.imageUrl ? String(data.payload.imageUrl) : null,
              description: data.payload?.description
                ? String(data.payload.description)
                : null,
              latitude: Number(data.payload?.latitude ?? 0),
              longitude: Number(data.payload?.longitude ?? 0),
              openingHours: data.payload?.openingHours
                ? String(data.payload.openingHours)
                : null,
              ticketRequired: Boolean(data.payload?.ticketRequired ?? false),
              price:
                data.payload?.price !== undefined &&
                data.payload?.price !== null &&
                data.payload?.price !== ''
                  ? Number(data.payload.price)
                  : null,
              visitDurationMinutes: Math.max(
                15,
                Number(data.payload?.visitDurationMinutes ?? 90),
              ),
              orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
            },
          });

          return { success: true, message: 'Lugar agregado' };
        }

        case 'update-place': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          const placeId = String(data.payload?.placeId ?? '');
          if (!placeId) {
            return { success: false, error: 'placeId es requerido' };
          }

          await assertDayBelongs(itinerary.id, data.dayId);

          const place = await db.itineraryPlace.findFirst({
            where: {
              id: placeId,
              dayId: data.dayId,
            },
            select: { id: true },
          });

          if (!place) {
            return { success: false, error: 'Lugar no encontrado' };
          }

          await db.itineraryPlace.update({
            where: { id: place.id },
            data: {
              name:
                data.payload?.name !== undefined
                  ? String(data.payload.name)
                  : undefined,
              type:
                data.payload?.type !== undefined
                  ? String(data.payload.type)
                  : undefined,
              imageUrl:
                data.payload?.imageUrl !== undefined
                  ? data.payload.imageUrl
                    ? String(data.payload.imageUrl)
                    : null
                  : undefined,
              description:
                data.payload?.description !== undefined
                  ? data.payload.description
                    ? String(data.payload.description)
                    : null
                  : undefined,
              latitude:
                data.payload?.latitude !== undefined
                  ? Number(data.payload.latitude)
                  : undefined,
              longitude:
                data.payload?.longitude !== undefined
                  ? Number(data.payload.longitude)
                  : undefined,
              openingHours:
                data.payload?.openingHours !== undefined
                  ? data.payload.openingHours
                    ? String(data.payload.openingHours)
                    : null
                  : undefined,
              ticketRequired:
                data.payload?.ticketRequired !== undefined
                  ? Boolean(data.payload.ticketRequired)
                  : undefined,
              price:
                data.payload?.price !== undefined
                  ? data.payload.price === null || data.payload.price === ''
                    ? null
                    : Number(data.payload.price)
                  : undefined,
              visitDurationMinutes:
                data.payload?.visitDurationMinutes !== undefined
                  ? Math.max(15, Number(data.payload.visitDurationMinutes))
                  : undefined,
            },
          });

          return { success: true, message: 'Lugar actualizado' };
        }

        case 'delete-place': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          const placeId = String(data.payload?.placeId ?? '');
          if (!placeId) {
            return { success: false, error: 'placeId es requerido' };
          }

          await assertDayBelongs(itinerary.id, data.dayId);

          await db.itineraryPlace.deleteMany({
            where: {
              id: placeId,
              dayId: data.dayId,
            },
          });

          const places = await db.itineraryPlace.findMany({
            where: { dayId: data.dayId },
            orderBy: { orderIndex: 'asc' },
            select: { id: true },
          });

          for (let index = 0; index < places.length; index += 1) {
            await db.itineraryPlace.update({
              where: { id: places[index].id },
              data: { orderIndex: index },
            });
          }

          return { success: true, message: 'Lugar eliminado' };
        }

        case 'reorder-places': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          const placeIds = Array.isArray(data.payload?.placeIds)
            ? (data.payload.placeIds as string[])
            : [];

          if (placeIds.length === 0) {
            return { success: false, error: 'No se enviaron lugares para reordenar' };
          }

          await assertDayBelongs(itinerary.id, data.dayId);

          for (let index = 0; index < placeIds.length; index += 1) {
            await db.itineraryPlace.updateMany({
              where: {
                id: placeIds[index],
                dayId: data.dayId,
              },
              data: {
                orderIndex: index,
              },
            });
          }

          return { success: true, message: 'Ruta reordenada' };
        }

        case 'autocomplete-day': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          await assertDayBelongs(itinerary.id, data.dayId);

          const { places } = getPopularPlacesForCity(itinerary.city, itinerary.country);
          const sorted = optimizePlacesByDistance(places).slice(0, 6);

          const maxOrder = await db.itineraryPlace.aggregate({
            where: { dayId: data.dayId },
            _max: { orderIndex: true },
          });
          let nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

          await db.itineraryPlace.createMany({
            data: sorted.map((place) => {
              const row = {
                dayId: data.dayId as string,
                name: place.name,
                type: place.type,
                imageUrl: place.imageUrl ?? null,
                description: place.description ?? null,
                latitude: place.latitude,
                longitude: place.longitude,
                openingHours: place.openingHours ?? null,
                ticketRequired: place.ticketRequired ?? false,
                price: place.price ?? null,
                visitDurationMinutes: place.visitDurationMinutes ?? 90,
                orderIndex: nextOrder,
              };
              nextOrder += 1;
              return row;
            }),
          });

          return {
            success: true,
            message: 'Día autocompletado con lugares populares',
          };
        }

        case 'optimize-day-route': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          const day = await db.itineraryDay.findFirst({
            where: {
              id: data.dayId,
              itineraryId: itinerary.id,
            },
            select: {
              id: true,
              date: true,
              places: {
                orderBy: { orderIndex: 'asc' },
                select: {
                  id: true,
                  latitude: true,
                  longitude: true,
                  openingHours: true,
                },
              },
            },
          });

          if (!day) {
            return { success: false, error: 'Día no encontrado' };
          }

          if (day.places.length <= 1) {
            return {
              success: false,
              error: 'Se necesitan al menos 2 lugares para optimizar',
            };
          }

          const optimized = optimizePlacesByDistance(day.places);

          for (let index = 0; index < optimized.length; index += 1) {
            await db.itineraryPlace.update({
              where: { id: optimized[index].id },
              data: { orderIndex: index },
            });
          }

          const warnings = optimized
            .map((place) => detectClosedWarning(place.openingHours, day.date))
            .filter((warning): warning is string => Boolean(warning));

          return {
            success: true,
            message: 'Ruta optimizada para reducir trayectos',
            warnings,
          };
        }

        case 'add-checklist-item': {
          if (!data.dayId) {
            return { success: false, error: 'dayId es requerido' };
          }

          const item = String(data.payload?.item ?? '').trim();
          if (!item) {
            return { success: false, error: 'El item no puede estar vacío' };
          }

          await assertDayBelongs(itinerary.id, data.dayId);

          const maxOrder = await db.itineraryChecklistItem.aggregate({
            where: { dayId: data.dayId },
            _max: { orderIndex: true },
          });

          await db.itineraryChecklistItem.create({
            data: {
              dayId: data.dayId,
              item,
              completed: false,
              orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
            },
          });

          return { success: true, message: 'Checklist actualizado' };
        }

        case 'update-checklist-item': {
          const checklistItemId = String(data.payload?.checklistItemId ?? '');
          const item = String(data.payload?.item ?? '').trim();

          if (!checklistItemId || !item) {
            return {
              success: false,
              error: 'checklistItemId e item son requeridos',
            };
          }

          await db.itineraryChecklistItem.updateMany({
            where: {
              id: checklistItemId,
              day: {
                itineraryId: itinerary.id,
              },
            },
            data: {
              item,
            },
          });

          return { success: true, message: 'Checklist actualizado' };
        }

        case 'toggle-checklist-item': {
          const checklistItemId = String(data.payload?.checklistItemId ?? '');
          if (!checklistItemId) {
            return { success: false, error: 'checklistItemId es requerido' };
          }

          const checklistItem = await db.itineraryChecklistItem.findFirst({
            where: {
              id: checklistItemId,
              day: {
                itineraryId: itinerary.id,
              },
            },
            select: {
              id: true,
              completed: true,
            },
          });

          if (!checklistItem) {
            return { success: false, error: 'Item no encontrado' };
          }

          await db.itineraryChecklistItem.update({
            where: { id: checklistItem.id },
            data: {
              completed: !checklistItem.completed,
            },
          });

          return { success: true, message: 'Checklist actualizado' };
        }

        case 'delete-checklist-item': {
          const checklistItemId = String(data.payload?.checklistItemId ?? '');
          if (!checklistItemId) {
            return { success: false, error: 'checklistItemId es requerido' };
          }

          await db.itineraryChecklistItem.deleteMany({
            where: {
              id: checklistItemId,
              day: {
                itineraryId: itinerary.id,
              },
            },
          });

          return { success: true, message: 'Item eliminado' };
        }

        default:
          return { success: false, error: 'Operación no soportada' };
      }
    } catch (error) {
      console.error('Error updating itinerary day:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el día del itinerario',
      };
    }
  });
