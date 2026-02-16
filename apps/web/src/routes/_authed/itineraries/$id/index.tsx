/** biome-ignore-all lint/a11y/useButtonType: handcrafted controls */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  ChevronLeft,
  GripVertical,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GradientLayout } from '~/components/gradient-layout';
import { ItineraryRouteMap } from '~/components/itinerary-route-map';
import { getItinerary } from './-actions/get-itinerary';
import { updateItineraryDay } from './-actions/update-itinerary-day';
import { updateItinerary } from './-actions/update-itinerary';
import { deleteItinerary } from './-actions/delete-itinerary';

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
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [placeDraft, setPlaceDraft] = useState({
    name: '',
    type: 'Monumento',
    latitude: '',
    longitude: '',
    openingHours: '',
    description: '',
  });
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

  useEffect(() => {
    setNotesDraft(selectedDay?.notes ?? '');
  }, [selectedDay?.id, selectedDay?.notes]);

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
    if (!selectedDay || !draggingPlaceId || draggingPlaceId === targetId) return;

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/70 bg-white/90 p-3">
            <div className="mb-2 flex items-center justify-between">
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

            <div className="space-y-2">
              {itinerary.days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setSelectedDayId(day.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selectedDayId === day.id
                      ? 'bg-[#4040b0] text-white'
                      : 'bg-gray-50 text-[#1a1a3e]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Día {day.dayNumber}</p>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        dayMutation.mutate({
                          data: {
                            itineraryId: itinerary.id,
                            dayId: day.id,
                            operation: 'delete-day',
                          },
                        });
                      }}
                      className={`rounded-md p-1 ${
                        selectedDayId === day.id
                          ? 'text-white/90 hover:bg-white/20'
                          : 'text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p
                    className={`mt-0.5 text-xs ${
                      selectedDayId === day.id ? 'text-white/80' : 'text-gray-500'
                    }`}
                  >
                    {new Intl.DateTimeFormat('es-CO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    }).format(new Date(day.date))}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            {selectedDay ? (
              <>
                <div className="rounded-3xl border border-white/70 bg-white/95 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[#1a1a3e]">
                        Día {selectedDay.dayNumber}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Distancia total: {selectedDay.totalDistanceKm.toFixed(1)} km ·
                        Traslados: {selectedDay.totalTravelMinutes} min
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          dayMutation.mutate({
                            data: {
                              itineraryId: itinerary.id,
                              dayId: selectedDay.id,
                              operation: 'autocomplete-day',
                            },
                          })
                        }
                        className="rounded-xl bg-[#eef0ff] px-3 py-2 text-sm font-medium text-[#4040b0]"
                      >
                        Autocompletar día
                      </button>

                      <button
                        onClick={() =>
                          dayMutation.mutate({
                            data: {
                              itineraryId: itinerary.id,
                              dayId: selectedDay.id,
                              operation: 'optimize-day-route',
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-xl bg-[#1a1a3e] px-3 py-2 text-sm font-medium text-white"
                      >
                        <Sparkles className="h-4 w-4" />
                        Optimizar ruta con IA
                      </button>

                      <button
                        onClick={() => setShowPlaceForm((current) => !current)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-[#1a1a3e]"
                      >
                        Agregar lugar manualmente
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Transporte
                      </label>
                      <select
                        value={selectedDay.transportMode}
                        onChange={(event) =>
                          dayMutation.mutate({
                            data: {
                              itineraryId: itinerary.id,
                              dayId: selectedDay.id,
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
                    <p className="mt-3 text-sm text-red-500">{dayMutation.data.error}</p>
                  ) : null}
                </div>

                {showPlaceForm ? (
                  <div className="rounded-3xl border border-white/70 bg-white/95 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-[#1a1a3e]">
                      Nuevo lugar
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        value={placeDraft.name}
                        onChange={(event) =>
                          setPlaceDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Nombre"
                        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                      />
                      <input
                        type="text"
                        value={placeDraft.type}
                        onChange={(event) =>
                          setPlaceDraft((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        placeholder="Tipo"
                        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                      />
                      <input
                        type="number"
                        step="0.000001"
                        value={placeDraft.latitude}
                        onChange={(event) =>
                          setPlaceDraft((current) => ({
                            ...current,
                            latitude: event.target.value,
                          }))
                        }
                        placeholder="Latitud"
                        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                      />
                      <input
                        type="number"
                        step="0.000001"
                        value={placeDraft.longitude}
                        onChange={(event) =>
                          setPlaceDraft((current) => ({
                            ...current,
                            longitude: event.target.value,
                          }))
                        }
                        placeholder="Longitud"
                        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                      />
                      <input
                        type="text"
                        value={placeDraft.openingHours}
                        onChange={(event) =>
                          setPlaceDraft((current) => ({
                            ...current,
                            openingHours: event.target.value,
                          }))
                        }
                        placeholder="Horario (ej. 09:00-18:00)"
                        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm md:col-span-2"
                      />
                      <textarea
                        value={placeDraft.description}
                        onChange={(event) =>
                          setPlaceDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Descripción corta"
                        className="min-h-[84px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm md:col-span-2"
                      />
                    </div>

                    <button
                      onClick={() => {
                        dayMutation.mutate({
                          data: {
                            itineraryId: itinerary.id,
                            dayId: selectedDay.id,
                            operation: 'add-place',
                            payload: {
                              ...placeDraft,
                              latitude: Number(placeDraft.latitude || 0),
                              longitude: Number(placeDraft.longitude || 0),
                            },
                          },
                        });
                        setPlaceDraft({
                          name: '',
                          type: 'Monumento',
                          latitude: '',
                          longitude: '',
                          openingHours: '',
                          description: '',
                        });
                        setShowPlaceForm(false);
                      }}
                      disabled={!placeDraft.name.trim()}
                      className="mt-3 rounded-xl bg-[#4040b0] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Guardar lugar
                    </button>
                  </div>
                ) : null}

                <ItineraryRouteMap
                  places={selectedDay.places.map((place) => ({
                    id: place.id,
                    name: place.name,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    type: place.type,
                  }))}
                  transportMode={selectedDay.transportMode}
                />

                <div className="rounded-3xl border border-white/70 bg-white/95 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-[#1a1a3e]">
                    Ruta del día
                  </h3>
                  <div className="space-y-3">
                    {selectedDay.places.length === 0 ? (
                      <p className="text-sm text-gray-500">Aún no hay lugares en este día.</p>
                    ) : (
                      selectedDay.places.map((place, index) => (
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
                                          dayId: selectedDay.id,
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
                                          dayId: selectedDay.id,
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
                                {place.type} · {place.openingHours ?? 'Horario no disponible'}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Ticket: {place.ticketRequired ? 'Sí' : 'No'} · Precio est.:{' '}
                                {place.price !== null ? `$${place.price}` : 'N/D'} · Visita:{' '}
                                {place.visitDurationMinutes} min
                              </p>

                              {place.description ? (
                                <p className="mt-1 text-sm text-gray-600">{place.description}</p>
                              ) : null}

                              {index > 0 ? (
                                <p className="mt-1 text-xs text-[#4040b0]">
                                  Desde anterior: {place.distanceFromPreviousLabel} ·{' '}
                                  {place.travelMinutesFromPrevious} min
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-gray-400">Inicio de ruta</p>
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
                  <h3 className="mb-2 text-sm font-semibold text-[#1a1a3e]">Notas</h3>
                  <textarea
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Notas del día"
                    className="min-h-[90px] w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  />
                  <button
                    onClick={() =>
                      dayMutation.mutate({
                        data: {
                          itineraryId: itinerary.id,
                          dayId: selectedDay.id,
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
                  <h3 className="mb-2 text-sm font-semibold text-[#1a1a3e]">Checklist</h3>

                  <div className="mb-3 flex gap-2">
                    <input
                      type="text"
                      value={checklistDraft}
                      onChange={(event) => setChecklistDraft(event.target.value)}
                      placeholder="Nuevo item"
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                    />
                    <button
                      onClick={() => {
                        if (!checklistDraft.trim()) return;
                        dayMutation.mutate({
                          data: {
                            itineraryId: itinerary.id,
                            dayId: selectedDay.id,
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
                    {selectedDay.checklistItems.length === 0 ? (
                      <p className="text-sm text-gray-500">Sin items aún.</p>
                    ) : (
                      selectedDay.checklistItems.map((item) => (
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
              </>
            ) : null}

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
      </div>
    </GradientLayout>
  );
}
