import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cn } from '#/lib/utils';
import { getHomeMessages } from '#/routes/_authed/(home)/-messages';

type HomeSectionProps = {
  title: string;
  className?: string;
  children: ReactNode;
  viewAllTo?: '/groups' | '/goals' | '/expenses/friends';
};

export function HomeSection({
  title,
  className,
  children,
  viewAllTo,
}: HomeSectionProps) {
  const t = getHomeMessages();

  return (
    <section className={cn('flex flex-col gap-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold leading-7">{title}</h2>
        {viewAllTo ? (
          <Link
            to={viewAllTo}
            className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            {t.common.viewAll}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
