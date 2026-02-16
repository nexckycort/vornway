import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GradientLayout } from '~/components/gradient-layout';
import { createItinerary } from './-actions/create-itinerary';

export const Route = createFileRoute('/_authed/itineraries/new/')({
  component: RouteComponent,
});

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function RouteComponent() {
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const next = new Date(today);
    next.setDate(next.getDate() + 3);
    return next;
  }, [today]);

  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState(toInputDate(today));
  const [endDate, setEndDate] = useState(toInputDate(defaultEnd));

  const createMutation = useMutation({
    mutationFn: createItinerary,
    onSuccess: (result) => {
      if (!result.success || !result.itineraryId) return;
      router.navigate({
        to: '/itineraries/$id',
        params: { id: result.itineraryId },
      });
    },
  });

  const totalDays = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    const oneDayMs = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / oneDayMs) + 1);
  }, [startDate, endDate]);

  return (
    <GradientLayout className="native-enter pb-8">
      <div className="px-4 pt-5 pb-3 lg:mx-auto lg:max-w-3xl lg:px-6 lg:pt-6">
        <div className="native-surface-muted flex items-center gap-3 px-3 py-2.5">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80"
          >
            <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1a1a3e]">Crear itinerario</h1>
            <p className="text-sm text-gray-500">
              Ciudad, país y fechas de viaje
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 lg:mx-auto lg:max-w-3xl lg:px-6">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm">
          <div className="mb-4">
            <label htmlFor="city" className="mb-2 block text-sm font-medium text-[#1a1a3e]">
              Ciudad
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ej: Madrid"
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-[#1a1a3e] placeholder:text-gray-400 focus:border-[#6060c0] focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="country"
              className="mb-2 block text-sm font-medium text-[#1a1a3e]"
            >
              País
            </label>
            <input
              id="country"
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Ej: España"
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-[#1a1a3e] placeholder:text-gray-400 focus:border-[#6060c0] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-medium text-[#1a1a3e]"
              >
                Fecha inicio
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-[#1a1a3e] focus:border-[#6060c0] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 block text-sm font-medium text-[#1a1a3e]"
              >
                Fecha fin
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-[#1a1a3e] focus:border-[#6060c0] focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-[#eef0ff] px-4 py-3 text-sm text-[#1a1a3e]">
            Duración estimada: <strong>{totalDays}</strong>{' '}
            {totalDays === 1 ? 'día' : 'días'}
          </div>

          {createMutation.data?.error ? (
            <p className="mt-4 text-sm text-red-500">{createMutation.data.error}</p>
          ) : null}

          <button
            type="button"
            onClick={() =>
              createMutation.mutate({
                data: {
                  city,
                  country,
                  startDate,
                  endDate,
                },
              })
            }
            disabled={
              createMutation.isPending ||
              !city.trim() ||
              !country.trim() ||
              !startDate ||
              !endDate ||
              totalDays <= 0
            }
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4040b0] px-4 py-4 font-semibold text-white disabled:opacity-60"
          >
            <WandSparkles className="h-5 w-5" />
            {createMutation.isPending ? 'Generando itinerario...' : 'Generar itinerario'}
          </button>
        </div>
      </div>
    </GradientLayout>
  );
}
