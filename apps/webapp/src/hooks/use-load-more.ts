import { useEffect, useEffectEvent, useState } from 'react';

type PagedQuery = {
  hasNextPage: boolean;
  isFetching: boolean;
  fetchNextPage: () => unknown;
};

export function useLoadMore(query: PagedQuery) {
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const loadMore = useEffectEvent(() => {
    if (!query.hasNextPage || query.isFetching) return;
    void query.fetchNextPage();
  });

  // Observing again after each fetch keeps loading while the sentinel stays on screen.
  useEffect(() => {
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, query.hasNextPage, query.isFetching]);

  return setSentinel;
}
