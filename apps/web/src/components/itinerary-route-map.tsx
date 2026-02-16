import { lazy, Suspense, useEffect, useState } from 'react';

export interface ItineraryMapPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
}

interface ItineraryRouteMapProps {
  places: ItineraryMapPlace[];
  transportMode?: string;
  className?: string;
}

const LeafletMap = lazy(async () => {
  const module = await import('./itinerary-route-map-leaflet');
  return {
    default: module.ItineraryRouteMapLeaflet,
  };
});

function MapFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-3 ${className}`}>
      <p className="mb-3 text-sm font-semibold text-[#1a1a3e]">Mapa del día</p>
      <div className="flex h-72 items-center justify-center rounded-xl bg-[#f5f7ff] text-sm text-gray-500">
        Cargando mapa...
      </div>
    </div>
  );
}

export function ItineraryRouteMap({
  places,
  transportMode,
  className = '',
}: ItineraryRouteMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <MapFallback className={className} />;
  }

  return (
    <Suspense fallback={<MapFallback className={className} />}>
      <LeafletMap
        places={places}
        transportMode={transportMode}
        className={className}
      />
    </Suspense>
  );
}
