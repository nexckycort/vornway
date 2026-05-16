import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';
import { useGroupsInfiniteQuery } from '#/routes/_authed/groups/-hooks/use-groups-infinite-query';

export const Route = createFileRoute('/_authed/groups/')({
  component: RouteComponent,
});

function RouteComponent() {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const groupsQuery = useGroupsInfiniteQuery();

  const groups = useMemo(
    () => groupsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [groupsQuery.data],
  );
  const total = groupsQuery.data?.pages[0]?.pagination.total ?? 0;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!groupsQuery.hasNextPage || groupsQuery.isFetching) return;
        void groupsQuery.fetchNextPage();
      },
      {
        root: null,
        rootMargin: '240px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [groupsQuery]);

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-10 pt-6">
        <header className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold leading-8 text-[#0f172a]">
              Mis grupos
            </h1>
            <Link
              to="/groups/new"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Crear grupo
            </Link>
          </div>
          <p className="text-sm text-[#64748b]">
            {groupsQuery.isLoading ? 'Cargando grupos...' : `${total} grupos en total`}
          </p>
        </header>

        {groupsQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(groupsQuery.error as Error).message}
          </div>
        ) : null}

        {!groupsQuery.isLoading && groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-5 py-8 text-center text-sm text-[#64748b]">
            Aún no tienes grupos.
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          {groups.map((group) => (
            <article
              key={group.id}
              className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-[#0f172a]">
                    {group.name}
                  </h2>
                  <p className="text-xs uppercase tracking-wide text-[#64748b]">
                    {group.type}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-medium text-[#1d4ed8]">
                  {group.participantCount} miembros
                </span>
              </div>

              {group.description ? (
                <p className="mb-3 line-clamp-2 text-sm text-[#475569]">
                  {group.description}
                </p>
              ) : null}

              <div className="flex items-center justify-between text-xs text-[#64748b]">
                <span>
                  Rol:{' '}
                  <span className="font-medium text-[#334155]">
                    {group.myMembership?.role ?? 'member'}
                  </span>
                </span>
                <span className="font-mono text-[#475569]">
                  {group.inviteCode}
                </span>
              </div>
            </article>
          ))}
        </section>

        <div ref={loadMoreRef} className="h-8" />

        {groupsQuery.isFetchingNextPage ? (
          <p className="text-center text-sm text-[#64748b]">Cargando más...</p>
        ) : null}

        {!groupsQuery.hasNextPage && groups.length > 0 ? (
          <p className="text-center text-sm text-[#94a3b8]">
            No hay más grupos por cargar.
          </p>
        ) : null}
      </div>
    </main>
  );
}
