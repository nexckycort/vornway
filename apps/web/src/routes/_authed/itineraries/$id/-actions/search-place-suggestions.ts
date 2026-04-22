/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const SearchPlaceSuggestionsInputSchema = z.object({
  itineraryId: z.string(),
  query: z.string().trim().min(2),
});

interface PlaceSuggestion {
  id: string;
  name: string;
  subtitle: string;
  type: string;
  latitude: number;
  longitude: number;
}

interface SearchPlaceSuggestionsResponse {
  success: boolean;
  suggestions?: PlaceSuggestion[];
  error?: string;
}

interface NominatimSearchItem {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  name?: string;
}

function normalizeType(className?: string, typeName?: string): string {
  const source = `${className ?? ''} ${typeName ?? ''}`.toLowerCase();
  if (source.includes('museum')) return 'Museo';
  if (source.includes('restaurant') || source.includes('food'))
    return 'Restaurante';
  if (source.includes('park') || source.includes('garden')) return 'Parque';
  if (source.includes('monument') || source.includes('memorial'))
    return 'Monumento';
  if (source.includes('historic')) return 'Sitio histórico';
  if (source.includes('attraction') || source.includes('tourism'))
    return 'Atracción';
  return 'Lugar';
}

function toSuggestion(item: NominatimSearchItem): PlaceSuggestion | null {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const displayName = item.display_name?.trim() ?? '';
  const shortName = (
    item.name?.trim() ||
    displayName.split(',')[0] ||
    'Lugar'
  ).trim();

  return {
    id: String(item.place_id),
    name: shortName,
    subtitle: displayName,
    type: normalizeType(item.class, item.type),
    latitude,
    longitude,
  };
}

async function fetchNominatimSearch(
  params: URLSearchParams,
): Promise<NominatimSearchItem[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'es',
        'User-Agent': 'Splitway/1.0 (itinerary-search)',
      },
    },
  );

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as NominatimSearchItem[];
}

async function resolveCityCenter(city: string, country: string) {
  const params = new URLSearchParams({
    city,
    country,
    format: 'jsonv2',
    limit: '1',
  });

  const result = await fetchNominatimSearch(params);
  const first = result[0];
  if (!first) return null;

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

function mergeUniqueSuggestions(
  groups: PlaceSuggestion[][],
): PlaceSuggestion[] {
  const seen = new Set<string>();
  const merged: PlaceSuggestion[] = [];

  for (const group of groups) {
    for (const suggestion of group) {
      const key = `${suggestion.name.toLowerCase()}|${suggestion.latitude.toFixed(5)}|${suggestion.longitude.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(suggestion);
      if (merged.length >= 20) return merged;
    }
  }

  return merged;
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

export const searchPlaceSuggestions = createServerFn({ method: 'POST' })
  .inputValidator(SearchPlaceSuggestionsInputSchema)
  .handler(async ({ data }): Promise<SearchPlaceSuggestionsResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const itinerary = await assertOwner(data.itineraryId, userId);

      const cityCenter = await resolveCityCenter(
        itinerary.city,
        itinerary.country,
      );

      const localByBoundsParams = new URLSearchParams({
        q: data.query,
        format: 'jsonv2',
        addressdetails: '1',
        dedupe: '1',
        limit: '20',
      });

      if (cityCenter) {
        const delta = 0.35;
        const left = cityCenter.longitude - delta;
        const right = cityCenter.longitude + delta;
        const top = cityCenter.latitude + delta;
        const bottom = cityCenter.latitude - delta;
        localByBoundsParams.set('viewbox', `${left},${top},${right},${bottom}`);
        localByBoundsParams.set('bounded', '1');
      }

      const localByContextParams = new URLSearchParams({
        q: `${data.query}, ${itinerary.city}, ${itinerary.country}`,
        format: 'jsonv2',
        addressdetails: '1',
        dedupe: '1',
        limit: '20',
      });

      const broadParams = new URLSearchParams({
        q: data.query,
        format: 'jsonv2',
        addressdetails: '1',
        dedupe: '1',
        limit: '20',
      });

      const [localByBoundsRaw, localByContextRaw, broadRaw] = await Promise.all(
        [
          fetchNominatimSearch(localByBoundsParams),
          fetchNominatimSearch(localByContextParams),
          fetchNominatimSearch(broadParams),
        ],
      );

      const suggestions = mergeUniqueSuggestions([
        localByBoundsRaw
          .map(toSuggestion)
          .filter((entry): entry is PlaceSuggestion => Boolean(entry)),
        localByContextRaw
          .map(toSuggestion)
          .filter((entry): entry is PlaceSuggestion => Boolean(entry)),
        broadRaw
          .map(toSuggestion)
          .filter((entry): entry is PlaceSuggestion => Boolean(entry)),
      ]);

      return {
        success: true,
        suggestions,
      };
    } catch (error) {
      console.error('Error searching place suggestions:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron buscar lugares',
      };
    }
  });
