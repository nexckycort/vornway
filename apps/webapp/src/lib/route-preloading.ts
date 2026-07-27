type PreloadTask = () => Promise<unknown> | undefined;

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
