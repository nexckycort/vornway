import type { ReactNode } from 'react';

import { Button } from '#/components/ui/button';
import { cn } from '#/lib/utils';

type HomeSectionProps = {
  title: string;
  className?: string;
  children: ReactNode;
};

export function HomeSection({ title, className, children }: HomeSectionProps) {
  return (
    <section className={cn('flex flex-col gap-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold leading-7">{title}</h2>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-primary"
        >
          Ver todo
        </Button>
      </div>
      {children}
    </section>
  );
}
