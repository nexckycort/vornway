import { ChevronLeftIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';
import { getSharedComponentMessages } from './-messages';
import { Button } from './ui/button';

type MobilePageLayoutProps = {
  title: string;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
};

export function MobilePageLayout({
  title,
  onBack,
  children,
  footer,
  scrollable = true,
}: MobilePageLayoutProps) {
  const t = getSharedComponentMessages();

  return (
    <main className="h-dvh bg-white md:h-[calc(100dvh-2.5rem)]">
      <div className="flex h-full w-full flex-col bg-white">
        <header className="flex shrink-0 items-center justify-between px-4 pb-4 pt-[calc(var(--safe-top)+1rem)]">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex size-11 items-center justify-center"
            aria-label={t.mobilePageLayout.backAria}
          >
            <HugeiconsIcon
              icon={ChevronLeftIcon}
              className="size-6 text-gray-800"
            />
          </Button>

          <h1 className="truncate px-2 text-base font-medium text-gray-900">
            {title}
          </h1>

          <div className="size-11" />
        </header>

        <div
          className={
            scrollable
              ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--safe-bottom)+var(--keyboard-inset)+1.5rem)]'
              : 'flex flex-1 flex-col px-4 pb-[calc(var(--safe-bottom)+var(--keyboard-inset)+1.5rem)]'
          }
          data-native-scroll={scrollable || undefined}
        >
          {children}
        </div>
        {footer ? (
          <footer className="shrink-0 border-t border-border bg-background/95 px-4 pb-[calc(var(--safe-bottom)+var(--keyboard-inset)+1rem)] pt-3 backdrop-blur-xl">
            {footer}
          </footer>
        ) : null}
      </div>
    </main>
  );
}
