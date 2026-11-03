import { useEffect, useEffectEvent, useRef } from 'react';

type PagedQuery = {
  hasNextPage: boolean;
  isFetching: boolean;
  fetchNextPage: () => unknown;
};

export function useLoadMoreSentinel(query: PagedQuery) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMore = useEffectEvent(() => {
    if (!query.hasNextPage || query.isFetching) return;
    void query.fetchNextPage();
  });

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        loadMore();
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return sentinelRef;
}
