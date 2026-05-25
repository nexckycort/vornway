import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus, Search, Target } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { GoalCard } from './-components/goal-card';
import { GoalsSkeleton } from './-components/goals-skeleton';
import { useGoalsInfiniteQuery } from './-hooks/use-goals-infinite-query';

export const Route = createFileRoute('/_authed/goals/')({
  component: RouteComponent,
});

function RouteComponent() {
  const isProduction = import.meta.env.PROD;
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const goalsQuery = useGoalsInfiniteQuery(search);

  const goals = useMemo(
    () => goalsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [goalsQuery.data],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!goalsQuery.hasNextPage || goalsQuery.isFetching) return;
        void goalsQuery.fetchNextPage();
      },
      {
        root: null,
        rootMargin: '240px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [goalsQuery]);

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="relative flex min-h-screen w-full flex-col bg-[#fafafa]">
        <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6">
          <header>
            <h1 className="text-3xl font-semibold leading-9 text-[#0f172a]">
              Metas
            </h1>
            <div className="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              En construcción: esta sección puede cambiar o tener errores
            </div>
          </header>

          <button
            type="button"
            onClick={() => void navigate({ to: '/goals/new' })}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-medium text-white shadow-[0_10px_24px_rgba(59,130,246,0.22)]"
          >
            <Plus className="size-4" />
            Crear nueva meta
          </button>

          <label className="mt-4 flex h-12 items-center gap-3 rounded-full border border-[#e2e8f0] bg-white px-4 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
            <Search className="size-4 shrink-0 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre de meta"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#94a3b8]"
            />
          </label>

          <section className="mt-6">
            {goalsQuery.isLoading ? (
              <GoalsSkeleton />
            ) : goalsQuery.isError ? (
              <div className="rounded-[28px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                No se pudieron cargar las metas.
              </div>
            ) : goals.length === 0 ? (
              <div className="rounded-[28px] border border-[#e2e8f0] bg-white px-5 py-8 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#eef2ff]">
                  <Target className="size-7 text-primary" />
                </div>
                <p className="text-base font-semibold text-[#0f172a]">
                  Aún no tienes metas
                </p>
                <p className="mt-2 text-sm text-[#64748b]">
                  Cuando crees una meta aparecerá aquí con su progreso y
                  vencimiento.
                </p>
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/goals/new' })}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-white"
                >
                  Crear meta
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onPress={() => {
                      void navigate({
                        to: '/goals/$id',
                        params: { id: goal.id },
                      });
                    }}
                  />
                ))}
              </div>
            )}

            <div ref={loadMoreRef} className="h-10" />

            {goalsQuery.isFetchingNextPage ? (
              <div className="mt-2 flex items-center justify-center text-sm text-[#64748b]">
                Cargando más metas...
              </div>
            ) : null}

            {!goalsQuery.hasNextPage && goals.length > 0 ? (
              <div className="mt-2 flex items-center justify-center text-xs text-[#94a3b8]">
                No hay más metas para mostrar.
              </div>
            ) : null}
          </section>
        </div>

        {isProduction ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-sm px-6">
            <div className="w-full max-w-[320px] rounded-3xl border border-white/70 bg-white/80 px-6 py-7 text-center shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Próximamente
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">
                Metas en construcción
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                Estamos mejorando esta sección. La experiencia puede cambiar y
                tener comportamientos inestables por ahora.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
