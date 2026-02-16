/** biome-ignore-all lint/a11y/useButtonType: handcrafted controls */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible';
import {
  ChevronDown,
  ChevronLeft,
  GripVertical,
  Loader2,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppDrawer } from '~/components/app-drawer';
import { GradientLayout } from '~/components/gradient-layout';
import { ItineraryRouteMap } from '~/components/itinerary-route-map';
import { deleteItinerary } from './-actions/delete-itinerary';
import { getItinerary } from './-actions/get-itinerary';
import { searchPlaceSuggestions } from './-actions/search-place-suggestions';
import { updateItinerary } from './-actions/update-itinerary';
import { updateItineraryDay } from './-actions/update-itinerary-day';

export const Route = createFileRoute('/_authed/itineraries/$id/')({
  component: RouteComponent,
});

const transportOptions = [
  { value: 'walking', label: 'Caminando' },
  { value: 'bus', label: 'Bus' },
  { value: 'train', label: 'Tren' },
  { value: 'car', label: 'Carro' },
] as const;

function toInputDate(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [draggingPlaceId, setDraggingPlaceId] = useState<string | null>(null);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [showPlaceDrawer, setShowPlaceDrawer] = useState(false);
  const [placeDrawerDayId, setPlaceDrawerDayId] = useState<string | null>(null);
  const [placeSearchDraft, setPlaceSearchDraft] = useState('');
  const [placeSearchTerm, setPlaceSearchTerm] = useState('');
  const [showMapDrawer, setShowMapDrawer] = useState(false);
  const [mapDrawerDayId, setMapDrawerDayId] = useState<string | null>(null);
  const [editItineraryDraft, setEditItineraryDraft] = useState<{
    city: string;
    country: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const itineraryQuery = useQuery({
    queryKey: ['itinerary', id],
    queryFn: () => getItinerary({ data: { itineraryId: id } }),
  });

  const dayMutation = useMutation({
    mutationFn: updateItineraryDay,
    onSuccess: async (result) => {
      if (!result.success) return;
      await queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
    },
  });

  const updateItineraryMutation = useMutation({
    mutationFn: updateItinerary,
    onSuccess: async (result) => {
      if (!result.success) return;
      await queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
    },
  });

  const deleteItineraryMutation = useMutation({
    mutationFn: deleteItinerary,
    onSuccess: (result) => {
      if (!result.success) return;
      router.navigate({ to: '/' });
    },
  });

  const itinerary = itineraryQuery.data?.itinerary;

  const placeSuggestionsQuery = useQuery({
    queryKey: ['place-suggestions', id, placeDrawerDayId, placeSearchTerm],
    queryFn: () =>
      searchPlaceSuggestions({
        data: {
          itineraryId: id,
          query: placeSearchTerm,
        },
      }),
    enabled:
      showPlaceDrawer &&
      Boolean(placeDrawerDayId) &&
      placeSearchTerm.trim().length >= 2,
  });

  useEffect(() => {
    if (!itinerary || itinerary.days.length === 0) return;

    setSelectedDayId((current) => {
      if (current && itinerary.days.some((day) => day.id === current)) {
        return current;
      }
      return itinerary.days[0].id;
    });
  }, [itinerary]);

  useEffect(() => {
    if (!itinerary) return;
    setEditItineraryDraft({
      city: itinerary.city,
      country: itinerary.country,
      startDate: toInputDate(itinerary.startDate),
      endDate: toInputDate(itinerary.endDate),
    });
  }, [itinerary?.id]);

  const selectedDay = useMemo(
    () => itinerary?.days.find((day) => day.id === selectedDayId) ?? null,
    [itinerary?.days, selectedDayId],
  );
  const mapDrawerDay = useMemo(
    () => itinerary?.days.find((day) => day.id === mapDrawerDayId) ?? null,
    [itinerary?.days, mapDrawerDayId],
  );

  useEffect(() => {
    setNotesDraft(selectedDay?.notes ?? '');
  }, [selectedDay?.id, selectedDay?.notes]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPlaceSearchTerm(placeSearchDraft.trim());
    }, 250);
    return () => clearTimeout(timeout);
  }, [placeSearchDraft]);

  useEffect(() => {
    if (!itinerary || !placeDrawerDayId) return;
    if (itinerary.days.some((day) => day.id === placeDrawerDayId)) return;
    setShowPlaceDrawer(false);
    setPlaceDrawerDayId(null);
  }, [itinerary, placeDrawerDayId]);

  useEffect(() => {
    if (!itinerary || !showMapDrawer) return;
    if (
      mapDrawerDayId &&
      itinerary.days.some((day) => day.id === mapDrawerDayId)
    )
      return;
    setMapDrawerDayId(selectedDayId ?? itinerary.days[0]?.id ?? null);
  }, [itinerary, showMapDrawer, mapDrawerDayId, selectedDayId]);

  if (itineraryQuery.isLoading) {
    return (
      <GradientLayout className="native-enter flex items-center justify-center pb-8">
        <p className="text-gray-500">Cargando itinerario...</p>
      </GradientLayout>
    );
  }

  if (!itineraryQuery.data?.success || !itinerary) {
    return (
      <GradientLayout className="native-enter flex flex-col items-center justify-center p-6 pb-8">
        <p className="mb-6 text-gray-500">
          {itineraryQuery.data?.error ?? 'No se pudo cargar el itinerario'}
        </p>
        <button
          onClick={() => router.navigate({ to: '/' })}
          className="rounded-xl bg-[#4040b0] px-6 py-3 text-white"
        >
          Volver al inicio
        </button>
      </GradientLayout>
    );
  }

  const handleReorderPlaces = (targetId: string) => {
    if (!selectedDay || !draggingPlaceId || draggingPlaceId === targetId)
      return;

    const ids = selectedDay.places.map((place) => place.id);
    const from = ids.indexOf(draggingPlaceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    ids.splice(from, 1);
    ids.splice(to, 0, draggingPlaceId);

    dayMutation.mutate({
      data: {
        itineraryId: itinerary.id,
        dayId: selectedDay.id,
        operation: 'reorder-places',
        payload: { placeIds: ids },
      },
    });
  };

  const handleOpenPlaceDrawer = (dayId: string) => {
    setPlaceDrawerDayId(dayId);
    setPlaceSearchDraft('');
    setPlaceSearchTerm('');
    setShowPlaceDrawer(true);
  };

  return (
    <GradientLayout className="native-enter pb-8">
      <div className="px-4 pt-5 pb-3 lg:mx-auto lg:max-w-7xl lg:px-6 lg:pt-6">
        <div className="native-surface-muted flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80"
            >
              <ChevronLeft className="h-6 w-6 text-[#1a1a3e]" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#1a1a3e]">
                {itinerary.city}, {itinerary.country}
              </h1>
              <p className="text-sm text-gray-500">{itinerary.dayCount} días</p>
            </div>
          </div>

          <button
            onClick={() =>
              deleteItineraryMutation.mutate({
                data: { itineraryId: itinerary.id },
              })
            }
            className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="px-4 lg:mx-auto lg:max-w-7xl lg:px-6">
        <section className="space-y-4">
          <div className="rounded-3xl border border-white/70 bg-white/90 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1a1a3e]">Días</p>
              <button
                onClick={() =>
                  dayMutation.mutate({
                    data: {
                      itineraryId: itinerary.id,
                      operation: 'add-day',
                    },
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg bg-[#eef0ff] px-2.5 py-1.5 text-xs font-medium text-[#4040b0]"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>
          </div>

          {itinerary.days.map((day) => {
            const isOpen = selectedDayId === day.id;

            return (
              <Collapsible
                key={day.id}
                open={isOpen}
                onOpenChange={(open) => {
                  setSelectedDayId((current) => {
                    if (open) return day.id;
                    return current === day.id ? null : current;
                  });
                }}
              >
                <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/95">
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a3e]">
                        Día {day.dayNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {new Intl.DateTimeFormat('es-CO', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        }).format(new Date(day.date))}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-[#1a1a3e] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t border-gray-100 px-4 pt-4 pb-4">
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-white/70 bg-white/95 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-semibold text-[#1a1a3e]">
                              Día {day.dayNumber}
                            </h2>
                            <p className="text-sm text-gray-500">
                              Distancia total: {day.totalDistanceKm.toFixed(1)}{' '}
                              km · Traslados: {day.totalTravelMinutes} min
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled
                              className="inline-flex items-center gap-1 rounded-xl bg-[#1a1a3e] px-3 py-2 text-sm font-medium text-white opacity-60"
                            >
                              <Sparkles className="h-4 w-4" />
                              Autocompletar día · Próximamente
                            </button>

                            <button
                              onClick={() =>
                                dayMutation.mutate({
                                  data: {
                                    itineraryId: itinerary.id,
                                    dayId: day.id,
                                    operation: 'delete-day',
                                  },
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar día
                            </button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <button
                            onClick={() => handleOpenPlaceDrawer(day.id)}
                            className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-500"
                          >
                            <Search className="h-4 w-4 text-gray-400" />
                            Añadir lugar
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`transport-${day.id}`}
                              className="mb-1 block text-xs font-medium text-gray-500"
                            >
                              Transporte
                            </label>
                            <select
                              id={`transport-${day.id}`}
                              value={day.transportMode}
                              onChange={(event) =>
                                dayMutation.mutate({
                                  data: {
                                    itineraryId: itinerary.id,
                                    dayId: day.id,
                                    operation: 'set-transport',
                                    payload: {
                                      transportMode: event.target.value,
                                    },
                                  },
                                })
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#1a1a3e]"
                            >
                              {transportOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {dayMutation.data?.warnings?.length ? (
                          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            {dayMutation.data.warnings.join(' · ')}
                          </div>
                        ) : null}

                        {dayMutation.data?.error ? (
                          <p className="mt-3 text-sm text-red-500">
                            {dayMutation.data.error}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-3xl border border-white/70 bg-white/95 p-4">
                        <h3 className="mb-3 text-sm font-semibold text-[#1a1a3e]">
                          Ruta del día
                        </h3>
                        <div className="space-y-3">
                          {day.places.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              Aún no hay lugares en este día.
                            </p>
                          ) : (
                            day.places.map((place, index) => (
                              <article
                                key={place.id}
                                draggable
                                onDragStart={() => setDraggingPlaceId(place.id)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => handleReorderPlaces(place.id)}
                                className="rounded-2xl border border-gray-100 bg-white p-3"
                              >
                                <div className="flex items-start gap-3">
                                  <button className="mt-0.5 rounded-lg bg-gray-100 p-2 text-gray-500">
                                    <GripVertical className="h-4 w-4" />
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="font-semibold text-[#1a1a3e]">
                                        {index + 1}. {place.name}
                                      </p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            const nextName = window.prompt(
                                              'Editar nombre del lugar',
                                              place.name,
                                            );
                                            if (!nextName) return;
                                            dayMutation.mutate({
                                              data: {
                                                itineraryId: itinerary.id,
                                                dayId: day.id,
                                                operation: 'update-place',
                                                payload: {
                                                  placeId: place.id,
                                                  name: nextName,
                                                },
                                              },
                                            });
                                          }}
                                          className="rounded-md bg-gray-100 p-1.5 text-gray-600"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            dayMutation.mutate({
                                              data: {
                                                itineraryId: itinerary.id,
                                                dayId: day.id,
                                                operation: 'delete-place',
                                                payload: { placeId: place.id },
                                              },
                                            })
                                          }
                                          className="rounded-md bg-red-50 p-1.5 text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {place.type} ·{' '}
                                      {place.openingHours ??
                                        'Horario no disponible'}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      Ticket:{' '}
                                      {place.ticketRequired ? 'Sí' : 'No'} ·
                                      Precio est.:{' '}
                                      {place.price !== null
                                        ? `$${place.price}`
                                        : 'N/D'}{' '}
                                      · Visita: {place.visitDurationMinutes} min
                                    </p>

                                    {place.description ? (
                                      <p className="mt-1 text-sm text-gray-600">
                                        {place.description}
                                      </p>
                                    ) : null}

                                    {index > 0 ? (
                                      <p className="mt-1 text-xs text-[#4040b0]">
                                        Desde anterior:{' '}
                                        {place.distanceFromPreviousLabel} ·{' '}
                                        {place.travelMinutesFromPrevious} min
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-xs text-gray-400">
                                        Inicio de ruta
                                      </p>
                                    )}

                                    {place.closedWarning ? (
                                      <p className="mt-1 text-xs text-amber-700">
                                        {place.closedWarning}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </article>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/70 bg-white/95 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-[#1a1a3e]">
                          Notas
                        </h3>
                        <textarea
                          value={isOpen ? notesDraft : (day.notes ?? '')}
                          onChange={(event) =>
                            setNotesDraft(event.target.value)
                          }
                          placeholder="Notas del día"
                          className="min-h-[90px] w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                        />
                        <button
                          onClick={() =>
                            dayMutation.mutate({
                              data: {
                                itineraryId: itinerary.id,
                                dayId: day.id,
                                operation: 'save-notes',
                                payload: {
                                  content: notesDraft,
                                },
                              },
                            })
                          }
                          className="mt-3 rounded-xl bg-[#4040b0] px-3 py-2 text-sm font-medium text-white"
                        >
                          Guardar notas
                        </button>
                      </div>

                      <div className="rounded-3xl border border-white/70 bg-white/95 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-[#1a1a3e]">
                          Checklist
                        </h3>

                        <div className="mb-3 flex gap-2">
                          <input
                            type="text"
                            value={checklistDraft}
                            onChange={(event) =>
                              setChecklistDraft(event.target.value)
                            }
                            placeholder="Nuevo item"
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                          />
                          <button
                            onClick={() => {
                              if (!checklistDraft.trim()) return;
                              dayMutation.mutate({
                                data: {
                                  itineraryId: itinerary.id,
                                  dayId: day.id,
                                  operation: 'add-checklist-item',
                                  payload: { item: checklistDraft },
                                },
                              });
                              setChecklistDraft('');
                            }}
                            className="rounded-xl bg-[#4040b0] px-3 py-2.5 text-sm font-medium text-white"
                          >
                            Agregar
                          </button>
                        </div>

                        <div className="space-y-2">
                          {day.checklistItems.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              Sin items aún.
                            </p>
                          ) : (
                            day.checklistItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() =>
                                    dayMutation.mutate({
                                      data: {
                                        itineraryId: itinerary.id,
                                        operation: 'toggle-checklist-item',
                                        payload: {
                                          checklistItemId: item.id,
                                        },
                                      },
                                    })
                                  }
                                />
                                <input
                                  type="text"
                                  value={item.item}
                                  onBlur={(event) =>
                                    dayMutation.mutate({
                                      data: {
                                        itineraryId: itinerary.id,
                                        operation: 'update-checklist-item',
                                        payload: {
                                          checklistItemId: item.id,
                                          item: event.target.value,
                                        },
                                      },
                                    })
                                  }
                                  className="flex-1 border-none bg-transparent text-sm text-[#1a1a3e] focus:outline-none"
                                />
                                <button
                                  onClick={() =>
                                    dayMutation.mutate({
                                      data: {
                                        itineraryId: itinerary.id,
                                        operation: 'delete-checklist-item',
                                        payload: {
                                          checklistItemId: item.id,
                                        },
                                      },
                                    })
                                  }
                                  className="rounded-md p-1 text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {editItineraryDraft ? (
            <div className="rounded-3xl border border-white/70 bg-white/95 p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#1a1a3e]">
                Editar itinerario
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  value={editItineraryDraft.city}
                  onChange={(event) =>
                    setEditItineraryDraft((current) =>
                      current
                        ? {
                            ...current,
                            city: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  placeholder="Ciudad"
                />
                <input
                  value={editItineraryDraft.country}
                  onChange={(event) =>
                    setEditItineraryDraft((current) =>
                      current
                        ? {
                            ...current,
                            country: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  placeholder="País"
                />
                <input
                  type="date"
                  value={editItineraryDraft.startDate}
                  onChange={(event) =>
                    setEditItineraryDraft((current) =>
                      current
                        ? {
                            ...current,
                            startDate: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
                <input
                  type="date"
                  value={editItineraryDraft.endDate}
                  onChange={(event) =>
                    setEditItineraryDraft((current) =>
                      current
                        ? {
                            ...current,
                            endDate: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>

              <button
                onClick={() =>
                  updateItineraryMutation.mutate({
                    data: {
                      itineraryId: itinerary.id,
                      city: editItineraryDraft.city,
                      country: editItineraryDraft.country,
                      startDate: editItineraryDraft.startDate,
                      endDate: editItineraryDraft.endDate,
                    },
                  })
                }
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#1a1a3e] px-3 py-2 text-sm font-medium text-white"
              >
                <MapPin className="h-4 w-4" />
                Guardar itinerario
              </button>

              {updateItineraryMutation.data?.error ? (
                <p className="mt-2 text-sm text-red-500">
                  {updateItineraryMutation.data.error}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <AppDrawer
        open={showMapDrawer}
        onOpenChange={(open) => {
          setShowMapDrawer(open);
          if (open) return;
          setMapDrawerDayId(null);
        }}
        className="data-[vaul-drawer-direction=bottom]:max-h-[98vh] lg:max-h-[94vh] lg:max-w-5xl"
      >
        <div className="max-h-[96vh] overflow-y-auto px-5 pb-6 lg:max-h-[92vh] lg:px-6">
          <div className="pt-3 pb-2">
            <h2 className="text-lg font-semibold text-[#1a1a3e]">
              Mapa del itinerario
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <ItineraryRouteMap
              places={(mapDrawerDay?.places ?? []).map((place) => ({
                id: place.id,
                name: place.name,
                latitude: place.latitude,
                longitude: place.longitude,
                type: place.type,
              }))}
              transportMode={mapDrawerDay?.transportMode ?? 'walking'}
            />
          </div>

          <div className="mt-3 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {itinerary.days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setMapDrawerDayId(day.id)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap ${
                    mapDrawerDayId === day.id
                      ? 'bg-[#4040b0] text-white'
                      : 'bg-gray-100 text-[#1a1a3e]'
                  }`}
                >
                  Día {day.dayNumber}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {(mapDrawerDay?.places.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500">
                Este día no tiene lugares aún.
              </p>
            ) : (
              mapDrawerDay?.places.map((place, index) => (
                <div
                  key={place.id}
                  className="rounded-xl border border-gray-100 bg-white px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-[#1a1a3e]">
                    {index + 1}. {place.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {place.type} ·{' '}
                    {place.openingHours ?? 'Horario no disponible'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </AppDrawer>

      <button
        onClick={() => setShowMapDrawer(true)}
        className="fixed right-4 bottom-24 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a3e] text-white shadow-lg lg:right-8 lg:bottom-8"
      >
        <MapIcon className="h-6 w-6" />
      </button>

      <AppDrawer
        open={showPlaceDrawer}
        onOpenChange={(open) => {
          setShowPlaceDrawer(open);
          if (open) return;
          setPlaceDrawerDayId(null);
          setPlaceSearchDraft('');
          setPlaceSearchTerm('');
        }}
        className="data-[vaul-drawer-direction=bottom]:max-h-[98vh] lg:max-h-[92vh] lg:max-w-4xl"
      >
        <div className="max-h-[96vh] overflow-y-auto px-5 pb-6 lg:max-h-[90vh] lg:px-6">
          <div className="pt-3 pb-2">
            <h2 className="text-lg font-semibold text-[#1a1a3e]">
              Añadir lugar
            </h2>
            <p className="text-sm text-gray-500">
              Escribe el nombre para ver coincidencias y seleccionar una.
            </p>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={placeSearchDraft}
              onChange={(event) => setPlaceSearchDraft(event.target.value)}
              placeholder="Añadir lugar"
              className="w-full rounded-xl border border-gray-200 py-2.5 pr-3 pl-9 text-sm text-[#1a1a3e]"
              autoFocus
            />
          </div>

          <div className="mt-4 max-h-[72vh] space-y-2 overflow-y-auto">
            {placeSearchDraft.trim().length < 2 ? (
              <p className="text-sm text-gray-500">
                Escribe al menos 2 caracteres para buscar.
              </p>
            ) : placeSuggestionsQuery.isFetching ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando lugares...
              </div>
            ) : placeSuggestionsQuery.data?.success === false ? (
              <p className="text-sm text-red-500">
                {placeSuggestionsQuery.data.error ??
                  'No se pudieron cargar resultados'}
              </p>
            ) : (placeSuggestionsQuery.data?.suggestions?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500">
                No encontramos coincidencias.
              </p>
            ) : (
              placeSuggestionsQuery.data?.suggestions?.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => {
                    if (!placeDrawerDayId) return;
                    dayMutation.mutate({
                      data: {
                        itineraryId: itinerary.id,
                        dayId: placeDrawerDayId,
                        operation: 'add-place',
                        payload: {
                          name: suggestion.name,
                          type: suggestion.type,
                          latitude: suggestion.latitude,
                          longitude: suggestion.longitude,
                          description: suggestion.subtitle,
                        },
                      },
                    });
                    setShowPlaceDrawer(false);
                    setPlaceDrawerDayId(null);
                    setPlaceSearchDraft('');
                    setPlaceSearchTerm('');
                  }}
                  className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left hover:bg-gray-50"
                >
                  <p className="text-sm font-medium text-[#1a1a3e]">
                    {suggestion.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {suggestion.type}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {suggestion.subtitle}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </AppDrawer>
    </GradientLayout>
  );
}
