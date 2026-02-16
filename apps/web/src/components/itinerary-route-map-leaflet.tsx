import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import type { ItineraryMapPlace } from './itinerary-route-map';

interface ItineraryRouteMapLeafletProps {
  places: ItineraryMapPlace[];
  transportMode?: string;
  className?: string;
}

function FitToPlaces({ places }: { places: ItineraryMapPlace[] }) {
  const map = useMap();

  useEffect(() => {
    if (places.length === 0) {
      map.setView([40.4168, -3.7038], 12);
      return;
    }

    if (places.length === 1) {
      map.setView([places[0].latitude, places[0].longitude], 13);
      return;
    }

    const bounds = L.latLngBounds(
      places.map((place) => [place.latitude, place.longitude] as [number, number]),
    );
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 14,
    });
  }, [map, places]);

  return null;
}

function numberedIcon(index: number) {
  return L.divIcon({
    className: 'itinerary-marker-wrapper',
    html: `<div class="itinerary-marker">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function ItineraryRouteMapLeaflet({
  places,
  transportMode = 'walking',
  className = '',
}: ItineraryRouteMapLeafletProps) {
  const fallbackRoute = useMemo(
    () =>
      places.map((place) => [place.latitude, place.longitude] as [number, number]),
    [places],
  );
  const [route, setRoute] = useState<Array<[number, number]>>(fallbackRoute);
  const [summary, setSummary] = useState<{
    distanceKm: number;
    durationMin: number;
    source: 'osrm' | 'fallback';
    profileLabel: string;
  } | null>(null);

  useEffect(() => {
    setRoute(fallbackRoute);
    if (places.length <= 1) {
      setSummary(null);
      return;
    }

    const toOsrmProfile = (mode: string): 'foot' | 'driving' | 'cycling' => {
      if (mode === 'walking') return 'foot';
      if (mode === 'car') return 'driving';
      if (mode === 'bus') return 'driving';
      if (mode === 'train') return 'driving';
      return 'foot';
    };

    const profile = toOsrmProfile(transportMode);
    const coordinates = places
      .map((place) => `${place.longitude},${place.latitude}`)
      .join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=false&annotations=false`;

    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('OSRM no disponible');
        }
        return response.json();
      })
      .then((data) => {
        const firstRoute = data?.routes?.[0];
        const coords = firstRoute?.geometry?.coordinates as
          | Array<[number, number]>
          | undefined;
        if (!firstRoute || !coords || coords.length === 0) {
          throw new Error('Sin geometría de ruta');
        }

        const mapped = coords.map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );
        setRoute(mapped);

        const rawDistanceKm = Number(firstRoute.distance ?? 0) / 1000;
        const rawDurationMin = Number(firstRoute.duration ?? 0) / 60;

        // OSRM no tiene perfiles bus/tren; aplicamos factor de ajuste aproximado.
        const durationFactor =
          transportMode === 'bus' ? 1.2 : transportMode === 'train' ? 0.7 : 1;

        setSummary({
          distanceKm: rawDistanceKm,
          durationMin: Math.max(1, Math.round(rawDurationMin * durationFactor)),
          source: 'osrm',
          profileLabel:
            transportMode === 'walking'
              ? 'caminando'
              : transportMode === 'car'
                ? 'carro'
                : transportMode === 'bus'
                  ? 'bus (estimado)'
                  : transportMode === 'train'
                    ? 'tren (estimado)'
                    : 'estimado',
        });
      })
      .catch(() => {
        setRoute(fallbackRoute);
        // fallback aproximado por segmentos rectos (haversine simplificado).
        let distanceKm = 0;
        for (let i = 1; i < places.length; i += 1) {
          const prev = places[i - 1];
          const current = places[i];
          const dx = current.latitude - prev.latitude;
          const dy = current.longitude - prev.longitude;
          distanceKm += Math.sqrt(dx * dx + dy * dy) * 111;
        }

        const speed =
          transportMode === 'walking'
            ? 4.8
            : transportMode === 'bus'
              ? 20
              : transportMode === 'train'
                ? 35
                : 30;
        const durationMin = Math.max(1, Math.round((distanceKm / speed) * 60));

        setSummary({
          distanceKm,
          durationMin,
          source: 'fallback',
          profileLabel: 'estimado',
        });
      });

    return () => controller.abort();
  }, [places, transportMode, fallbackRoute]);

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-3 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#1a1a3e]">Mapa del día</p>
        {summary ? (
          <p className="text-xs text-gray-500">
            {summary.distanceKm.toFixed(1)} km · {summary.durationMin} min ·{' '}
            {summary.profileLabel}
            {summary.source === 'fallback' ? ' · offline' : ''}
          </p>
        ) : null}
      </div>

      <div className="h-72 overflow-hidden rounded-xl border border-gray-100">
        <MapContainer
          center={[40.4168, -3.7038]}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitToPlaces places={places} />

          {route.length > 1 ? (
            <Polyline
              positions={route}
              pathOptions={{
                color: '#4040b0',
                weight: 4,
                opacity: 0.75,
              }}
            />
          ) : null}

          {places.map((place, index) => (
            <Marker
              key={place.id}
              position={[place.latitude, place.longitude]}
              icon={numberedIcon(index)}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                {index + 1}. {place.name}
              </Tooltip>
              <Popup>
                <div className="min-w-[160px]">
                  <p className="text-sm font-semibold text-[#1a1a3e]">{place.name}</p>
                  {place.type ? (
                    <p className="text-xs text-gray-500">Tipo: {place.type}</p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
