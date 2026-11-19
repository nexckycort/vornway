import { useEffect, useEffectEvent } from 'react';

type Overlay = { close: () => void };

const depthKey = 'overlayDepth';
const openOverlays: Overlay[] = [];
let isTraversing = false;
let isSyncScheduled = false;
let isListening = false;

export function useOverlayHistory(open: boolean, onClose: () => void) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;

    const overlay = { close: () => close() };
    openOverlays.push(overlay);
    scheduleSync();

    return () => {
      const index = openOverlays.indexOf(overlay);
      if (index !== -1) openOverlays.splice(index, 1);
      scheduleSync();
    };
  }, [open]);
}

export const isOverlayHistoryTraversal = () => isTraversing;

const historyDepth = () => Number(window.history.state?.[depthKey] ?? 0);

// Deferred so overlays closing and opening in the same commit hand over their history entry instead of racing.
function scheduleSync() {
  if (!isListening) {
    window.addEventListener('popstate', handlePopState);
    isListening = true;
  }
  if (isSyncScheduled) return;

  isSyncScheduled = true;
  queueMicrotask(syncHistory);
}

function syncHistory() {
  isSyncScheduled = false;
  if (isTraversing) return;

  const depth = historyDepth();
  if (openOverlays.length < depth) {
    isTraversing = true;
    window.history.go(openOverlays.length - depth);
    return;
  }

  Array.from(
    { length: openOverlays.length - depth },
    (_, index) => depth + index + 1,
  ).forEach((nextDepth) => {
    window.history.pushState(
      { ...window.history.state, [depthKey]: nextDepth },
      '',
    );
  });
}

function handlePopState() {
  if (isTraversing) {
    isTraversing = false;
    scheduleSync();
    return;
  }

  openOverlays
    .splice(historyDepth())
    .toReversed()
    .forEach((overlay) => overlay.close());
  scheduleSync();
}
