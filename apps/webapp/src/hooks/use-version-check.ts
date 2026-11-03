import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { API_URL } from '#/config/env';
import { m } from '#/paraglide/messages.js';

const VERSION_STORAGE_KEY = 'vornway.app.version';
const VERSION_ENDPOINT = `${API_URL.replace(/\/$/, '')}/version`;

type VersionResponse = {
  version: string;
};

function getStoredVersion() {
  try {
    return window.localStorage.getItem(VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredVersion(version: string) {
  try {
    window.localStorage.setItem(VERSION_STORAGE_KEY, version);
  } catch {
    return;
  }
}

async function fetchRemoteVersion() {
  const response = await fetch(VERSION_ENDPOINT, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(m['system.versionCheckFailed']());
  }

  const data = (await response.json()) as VersionResponse;
  return data.version;
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;

  const registration =
    (await navigator.serviceWorker.getRegistration('/')) ??
    (await navigator.serviceWorker.ready);

  return registration;
}

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const remoteVersionRef = useRef<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return false;

    try {
      const remoteVersion = await fetchRemoteVersion();
      const currentVersion = getStoredVersion();
      remoteVersionRef.current = remoteVersion;

      if (!currentVersion) {
        setStoredVersion(remoteVersion);
        return false;
      }

      const hasUpdate = currentVersion !== remoteVersion;
      setUpdateAvailable(hasUpdate);

      if (hasUpdate && 'serviceWorker' in navigator) {
        const registration = await getServiceWorkerRegistration();
        await registration?.update();
      }

      return hasUpdate;
    } catch {
      return false;
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);

    try {
      const remoteVersion =
        remoteVersionRef.current ?? (await fetchRemoteVersion());
      const registration = await getServiceWorkerRegistration();

      setStoredVersion(remoteVersion);

      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      window.location.reload();
    } catch {
      setIsUpdating(false);
    }
  }, []);

  const runCheck = useEffectEvent(() => {
    void checkForUpdates();
  });
  const reloadIfUpdating = useEffectEvent(() => {
    if (isUpdating) window.location.reload();
  });

  useEffect(() => {
    const initialCheck = window.setTimeout(runCheck, 0);
    const interval = window.setInterval(runCheck, 15 * 60 * 1000);

    window.addEventListener('online', runCheck);
    navigator.serviceWorker?.addEventListener(
      'controllerchange',
      reloadIfUpdating,
    );

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      window.removeEventListener('online', runCheck);
      navigator.serviceWorker?.removeEventListener(
        'controllerchange',
        reloadIfUpdating,
      );
    };
  }, []);

  return {
    updateAvailable,
    isUpdating,
    checkForUpdates,
    applyUpdate,
  };
}
