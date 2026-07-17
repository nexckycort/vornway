import { useRef, useSyncExternalStore } from 'react';
import { isShallowEqual } from '#/utils/is-shallow-equal';

type ConnectionLike = {
  downlink?: number;
  downlinkMax?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
  type?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: ConnectionLike;
  mozConnection?: ConnectionLike;
  webkitConnection?: ConnectionLike;
};

type NetworkState = {
  online: boolean;
  downlink: number | undefined;
  downlinkMax: number | undefined;
  effectiveType: string | undefined;
  rtt: number | undefined;
  saveData: boolean | undefined;
  type: string | undefined;
};

const getConnection = (): ConnectionLike | undefined => {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection;
};

const useNetworkStateSubscribe = (callback: () => void) => {
  window.addEventListener('online', callback, { passive: true });
  window.addEventListener('offline', callback, { passive: true });

  const connection = getConnection();

  if (connection?.addEventListener) {
    connection.addEventListener('change', callback);
  }

  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);

    if (connection?.removeEventListener) {
      connection.removeEventListener('change', callback);
    }
  };
};

const getNetworkStateServerSnapshot = (): never => {
  throw Error('useNetworkState is a client-only hook');
};

export function useNetworkState() {
  const cache = useRef<NetworkState>({
    online: true,
    downlink: undefined,
    downlinkMax: undefined,
    effectiveType: undefined,
    rtt: undefined,
    saveData: undefined,
    type: undefined,
  });

  const getSnapshot = (): NetworkState => {
    const online = navigator.onLine;
    const connection = getConnection();

    const nextState: NetworkState = {
      online,
      downlink: connection?.downlink,
      downlinkMax: connection?.downlinkMax,
      effectiveType: connection?.effectiveType,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      type: connection?.type,
    };

    if (isShallowEqual(cache.current, nextState)) {
      return cache.current;
    } else {
      cache.current = nextState;
      return nextState;
    }
  };

  return useSyncExternalStore(
    useNetworkStateSubscribe,
    getSnapshot,
    getNetworkStateServerSnapshot,
  );
}
