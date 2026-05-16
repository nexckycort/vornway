import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

import { cn } from '#/lib/utils';

type HomeSectionProps = {
  title: string;
  className?: string;
  children: ReactNode;
  viewAllTo?: '/groups' | '/goals';
};

export function HomeSection({
  title,
  className,
  children,
  viewAllTo,
}: HomeSectionProps) {
  return (
    <section className={cn('flex flex-col gap-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold leading-7">{title}</h2>
        {viewAllTo ? (
          <Link
            to={viewAllTo}
            className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            Ver todo
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
