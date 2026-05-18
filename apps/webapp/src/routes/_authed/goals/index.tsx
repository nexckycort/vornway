import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus, Target } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { GoalCard } from './-components/goal-card';
import { GoalsSkeleton } from './-components/goals-skeleton';
import { useGoalsInfiniteQuery } from './-hooks/use-goals-infinite-query';

export const Route = createFileRoute('/_authed/goals/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const goalsQuery = useGoalsInfiniteQuery();

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
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa]">
        <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f1f5f9] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#475569]">
                Metas de ahorro
              </div>
              <h1 className="mt-3 text-2xl font-semibold leading-8 text-[#0f172a]">
                Tus objetivos
              </h1>
              <p className="mt-1 text-sm text-[#64748b]">
                Seguimiento de ahorro por meta y grupo asociado.
              </p>
            </div>

            <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#64748b]">
                Total
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0f172a]">
                {goals.length}
              </p>
            </div>
          </header>

          <button
            type="button"
            onClick={() => void navigate({ to: '/goals/new' })}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-white shadow-[0_10px_24px_rgba(59,130,246,0.22)]"
          >
            <Plus className="size-4" />
            Crear meta
          </button>

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
      </div>
    </main>
  );
}
