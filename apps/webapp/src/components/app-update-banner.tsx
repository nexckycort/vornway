import { useEffect, useRef } from 'react';
import { useVersionCheck } from '#/hooks/use-version-check';

export function AppUpdateBanner() {
  const { updateAvailable, isUpdating, applyUpdate } = useVersionCheck();
  const updateStartedRef = useRef(false);

  useEffect(() => {
    if (!updateAvailable || isUpdating || updateStartedRef.current) return;

    updateStartedRef.current = true;
    void applyUpdate();
  }, [applyUpdate, isUpdating, updateAvailable]);

  return null;
}
