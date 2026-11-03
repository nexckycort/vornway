import { useEffect, useEffectEvent, useRef } from 'react';

type UseLoadMoreObserverOptions = {
  hasNextPage: boolean;
  isFetching: boolean;
  fetchNextPage: () => unknown;
};

export function useLoadMoreObserver({
  hasNextPage,
  isFetching,
  fetchNextPage,
}: UseLoadMoreObserverOptions) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMore = useEffectEvent(() => {
    if (!hasNextPage || isFetching) return;
    void fetchNextPage();
  });

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        loadMore();
      },
      {
        root: null,
        rootMargin: '240px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return loadMoreRef;
}
