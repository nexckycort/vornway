type PreloadTask = () => Promise<unknown> | undefined;

type FirstVisitMetric = {
  duration: number;
  pathname: string;
  route: string;
};

const METRICS_WINDOW_KEY = '__VORNWAY_FIRST_ROUTE_VISITS__';

function scheduleIdleTask(callback: () => void) {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }

  const id = globalThis.setTimeout(callback, 32);
  return () => globalThis.clearTimeout(id);
}

/**
 * Prepares one route per idle period so route parsing never competes with the
 * first authenticated render or with a burst of user input.
 */
export function scheduleRoutePreloads(tasks: readonly PreloadTask[]) {
  let cancelled = false;
  let cancelScheduledTask: (() => void) | undefined;
  let taskIndex = 0;

  const scheduleNext = () => {
    if (cancelled || taskIndex >= tasks.length) return;

    cancelScheduledTask = scheduleIdleTask(() => {
      if (cancelled) return;

      const task = tasks[taskIndex];
      taskIndex += 1;

      Promise.resolve(task?.())
        .catch(() => {
          // Intent preloading is an optimization and must never break routing.
        })
        .finally(scheduleNext);
    });
  };

  scheduleNext();

  return () => {
    cancelled = true;
    cancelScheduledTask?.();
  };
}

function getTrackedRoute(pathname: string): string | null {
  if (pathname === '/') return '/';
  if (pathname === '/expenses/friends') return '/expenses/friends';
  if (pathname === '/expenses/new') return '/expenses/new';
  if (pathname === '/expenses/quick-split') return '/expenses/quick-split';
  if (pathname === '/groups' || pathname === '/groups/') return '/groups';
  if (pathname === '/groups/new' || pathname === '/groups/new/') {
    return '/groups/new';
  }
  if (pathname === '/goals' || pathname === '/goals/') return '/goals';
  if (pathname === '/goals/new') return '/goals/new';
  if (pathname === '/profile' || pathname === '/profile/') return '/profile';
  if (/^\/groups\/[^/]+\/add-expense\/?$/.test(pathname)) {
    return '/groups/$id/add-expense';
  }
  if (/^\/groups\/[^/]+\/?$/.test(pathname)) return '/groups/$id';
  if (/^\/goals\/[^/]+\/?$/.test(pathname)) return '/goals/$id';
  if (/^\/expenses\/friends\/[^/]+\/[^/]+\/?$/.test(pathname)) {
    return '/expenses/friends/$quickSplitId/$expenseId';
  }

  return null;
}

/** Records the first rendered visit of common routes on the user's device. */
export function createFirstVisitTracker(initialPathname: string) {
  const measuredRoutes = new Set<string>();
  const starts = new Map<string, { pathname: string; time: number }>();
  const initialRoute = getTrackedRoute(initialPathname);

  if (initialRoute) {
    starts.set(initialRoute, {
      pathname: initialPathname,
      time: performance.now(),
    });
  }

  return {
    start(pathname: string) {
      const route = getTrackedRoute(pathname);
      if (!route || measuredRoutes.has(route) || starts.has(route)) return;
      starts.set(route, { pathname, time: performance.now() });
    },
    finish(pathname: string) {
      const route = getTrackedRoute(pathname);
      if (!route || measuredRoutes.has(route)) return;

      const start = starts.get(route);
      if (!start) return;

      const end = performance.now();
      const metric: FirstVisitMetric = {
        duration: Math.round((end - start.time) * 10) / 10,
        pathname: start.pathname,
        route,
      };
      measuredRoutes.add(route);
      starts.delete(route);

      const existing = Reflect.get(window, METRICS_WINDOW_KEY);
      const metrics: FirstVisitMetric[] = Array.isArray(existing)
        ? [...existing, metric]
        : [metric];
      Reflect.set(window, METRICS_WINDOW_KEY, metrics);

      performance.measure(`vornway:first-visit:${route}`, {
        start: start.time,
        end,
        detail: metric,
      });
    },
  };
}
