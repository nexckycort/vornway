import { RefreshIcon, WifiIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNetworkState } from '#/hooks/use-network-state';
import {
  getPendingExpensesCount,
  subscribePendingExpenses,
} from '#/lib/offline-expense-query-collection';
import {
  getPendingGroupsCount,
  subscribePendingGroups,
} from '#/lib/offline-group-query-collection';
import { getSharedComponentMessages } from './-messages';

const PULL_TO_REFRESH_TRIGGER_PX = 72;
const MAX_PULL_DISTANCE_PX = 96;
const EDGE_BACK_TRIGGER_PX = 88;

function vibrate(duration: number) {
  navigator.vibrate?.(duration);
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}

function isAtScrollStart(target: EventTarget | null) {
  if (target instanceof Element) {
    const scrollContainer = target.closest<HTMLElement>('[data-native-scroll]');
    if (scrollContainer) return scrollContainer.scrollTop <= 0;
  }

  return window.scrollY <= 0;
}

function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function NativeAppEnhancements() {
  const t = getSharedComponentMessages();
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const edgeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardInset = () => {
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      document.documentElement.style.setProperty(
        '--keyboard-inset',
        `${inset}px`,
      );
      document.documentElement.toggleAttribute(
        'data-keyboard-open',
        inset > 80,
      );
    };

    updateKeyboardInset();
    viewport.addEventListener('resize', updateKeyboardInset);
    viewport.addEventListener('scroll', updateKeyboardInset);
    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset);
      viewport.removeEventListener('scroll', updateKeyboardInset);
      document.documentElement.style.removeProperty('--keyboard-inset');
      document.documentElement.removeAttribute('data-keyboard-open');
    };
  }, []);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || isEditableTarget(event.target)) return;

      if (isAtScrollStart(event.target)) {
        pullStartY.current = touch.clientY;
      }

      if (isStandaloneApp() && touch.clientX <= 20) {
        edgeStart.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;

      if (pullStartY.current !== null) {
        const distance = touch.clientY - pullStartY.current;
        if (distance > 0) {
          const nextDistance = Math.min(
            MAX_PULL_DISTANCE_PX,
            Math.round(distance * 0.45),
          );
          pullDistanceRef.current = nextDistance;
          setPullDistance(nextDistance);
        }
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (
        pullDistanceRef.current >= PULL_TO_REFRESH_TRIGGER_PX &&
        !refreshingRef.current
      ) {
        refreshingRef.current = true;
        setIsRefreshing(true);
        vibrate(12);
        void queryClient
          .invalidateQueries({ refetchType: 'active' })
          .finally(() => {
            refreshingRef.current = false;
            pullDistanceRef.current = 0;
            setIsRefreshing(false);
            setPullDistance(0);
          });
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }

      if (edgeStart.current) {
        const edge = edgeStart.current;
        const touch = event.changedTouches[0];
        const deltaX = touch ? touch.clientX - edge.x : 0;
        const deltaY = touch ? touch.clientY - edge.y : 0;

        if (
          deltaX >= EDGE_BACK_TRIGGER_PX &&
          deltaX > Math.abs(deltaY) * 1.5 &&
          window.history.length > 1
        ) {
          vibrate(10);
          window.history.back();
        }

        edgeStart.current = null;
      }

      pullStartY.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [queryClient]);

  const isVisible = isRefreshing || pullDistance > 0;
  const label = isRefreshing ? t.native.refreshing : t.native.pullToRefresh;

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+0.5rem)] z-[130] flex justify-center transition-transform duration-200"
      style={{
        transform: `translateY(${isVisible ? pullDistance : -72}px)`,
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-xl">
        <HugeiconsIcon
          icon={RefreshIcon}
          className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
        />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function OfflineSyncStatus() {
  const t = getSharedComponentMessages();
  const network = useNetworkState();
  const pendingExpenses = useSyncExternalStore(
    subscribePendingExpenses,
    getPendingExpensesCount,
    () => 0,
  );
  const pendingGroups = useSyncExternalStore(
    subscribePendingGroups,
    getPendingGroupsCount,
    () => 0,
  );
  const pending = pendingExpenses + pendingGroups;

  if (!network.online || pending === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+0.75rem)] z-[119] flex justify-center px-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-sky-700 shadow-[0_8px_20px_rgba(14,116,144,0.12)] backdrop-blur-xl">
        <HugeiconsIcon icon={WifiIcon} className="size-3.5 animate-pulse" />
        <span>{t.native.syncingChanges(pending)}</span>
      </div>
    </div>
  );
}
