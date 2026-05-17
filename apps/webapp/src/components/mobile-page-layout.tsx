import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui/button';

type MobilePageLayoutProps = {
  title: string;
  onBack: () => void;
  children: ReactNode;
};

export function MobilePageLayout({
  title,
  onBack,
  children,
}: MobilePageLayoutProps) {
  return (
    <main className="min-h-screen bg-white">
      <div className="flex min-h-screen w-full flex-col bg-white">
        <header className="flex items-center justify-between px-4 pt-6 pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex size-8 items-center justify-center"
            aria-label="Atrás"
          >
            <ChevronLeft className="size-6 text-gray-800" />
          </Button>

          <h1 className="truncate px-2 text-base font-medium text-gray-900">
            {title}
          </h1>

          <div className="size-8" />
        </header>

        <div className="px-4 pb-6">{children}</div>
      </div>
    </main>
  );
}
