import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { usePWAInstall } from '#/hooks/use-pwa-install';
import { getSharedComponentMessages } from './-messages';

const DISMISSED_KEY = 'vornway.pwa-install-prompt-dismissed-at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed() {
  const value = window.localStorage.getItem(DISMISSED_KEY);
  const dismissedAt = value ? Number(value) : 0;
  return (
    Number.isFinite(dismissedAt) &&
    Date.now() - dismissedAt < DISMISS_DURATION_MS
  );
}

export function PwaInstallPrompt() {
  const t = getSharedComponentMessages();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  useEffect(() => {
    if (!isInstallable || isInstalled || wasRecentlyDismissed()) return;

    const timeoutId = window.setTimeout(() => setVisible(true), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [isInstallable, isInstalled]);

  if (!visible || isInstalled || !isInstallable) return null;

  return (
    <aside className="fixed inset-x-4 bottom-[calc(var(--safe-bottom)+5.75rem+var(--keyboard-inset))] z-[110] mx-auto max-w-sm rounded-[24px] border border-white/60 bg-white/90 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.16)] backdrop-blur-xl">
      <button
        type="button"
        aria-label={t.native.dismissInstall}
        onClick={dismiss}
        className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </button>
      <p className="pr-8 text-sm font-semibold text-foreground">
        {t.native.installTitle}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {t.native.installCopy}
      </p>
      <button
        type="button"
        onClick={async () => {
          const result = await installApp();
          if (result.success || result.reason === 'dismissed') dismiss();
        }}
        className="native-tap mt-3 flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        {t.native.installAction}
      </button>
    </aside>
  );
}
