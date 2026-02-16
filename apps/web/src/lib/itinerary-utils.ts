export type TransportMode = 'walking' | 'bus' | 'train' | 'car';

export interface ItinerarySeedPlace {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  description?: string;
  openingHours?: string;
  ticketRequired?: boolean;
  price?: number;
  visitDurationMinutes?: number;
}

const TRANSPORT_SPEED_KMH: Record<TransportMode, number> = {
  walking: 4.8,
  bus: 20,
  train: 35,
  car: 30,
};

export function toTransportMode(value: string | null | undefined): TransportMode {
  if (value === 'bus' || value === 'train' || value === 'car') {
    return value;
  }
  return 'walking';
}

export function estimateTravelMinutes(
  distanceKm: number,
  transportMode: TransportMode,
): number {
  const speed = TRANSPORT_SPEED_KMH[transportMode] ?? TRANSPORT_SPEED_KMH.walking;
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function buildDateRange(startDate: Date, endDate: Date): Date[] {
  const result: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    result.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export function normalizeLocationKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

export function optimizePlacesByDistance<T extends { latitude: number; longitude: number }>(
  places: T[],
): T[] {
  if (places.length <= 2) {
    return places;
  }

  const remaining = [...places];
  const route: T[] = [];

  // Start from the first element to keep user intent when manual order exists.
  const start = remaining.shift();
  if (!start) return places;
  route.push(start);

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nextIndex = 0;
    let nextDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const distance = haversineDistanceKm(
        last.latitude,
        last.longitude,
        candidate.latitude,
        candidate.longitude,
      );
      if (distance < nextDistance) {
        nextDistance = distance;
        nextIndex = i;
      }
    }

    const [next] = remaining.splice(nextIndex, 1);
    route.push(next);
  }

  return route;
}

const WEEKDAY_KEYS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const;

export function detectClosedWarning(
  openingHours: string | null | undefined,
  date: Date,
): string | null {
  if (!openingHours) return null;
  const lower = openingHours.toLowerCase();

  if (!lower.includes('cerrado')) {
    return null;
  }

  const weekdayKey = WEEKDAY_KEYS_ES[date.getDay()];
  if (lower.includes(weekdayKey)) {
    return `Posible cierre el ${weekdayKey}`;
  }

  return null;
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function offsetSeedCoordinates(
  baseLat: number,
  baseLng: number,
  index: number,
): { latitude: number; longitude: number } {
  const radius = 0.008 + index * 0.0018;
  const angle = ((index + 1) * 53 * Math.PI) / 180;

  return {
    latitude: baseLat + radius * Math.cos(angle),
    longitude: baseLng + radius * Math.sin(angle),
  };
}
