import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Compass,
  Home,
  type LucideIcon,
  PiggyBank,
  UserRound,
} from 'lucide-react';

import { cn } from '#/lib/utils';

export type BottomAppBarIconName = 'compass' | 'home' | 'piggy-bank' | 'user';

type BottomAppBarItem = {
  id: string;
  label: string;
  icon: BottomAppBarIconName;
  to: '/' | '/groups' | '/goals' | '/profile';
};

const navIcons: Record<BottomAppBarIconName, LucideIcon> = {
  compass: Compass,
  home: Home,
  'piggy-bank': PiggyBank,
  user: UserRound,
};

const items: BottomAppBarItem[] = [
  { id: 'home', label: 'Inicio', icon: 'home', to: '/' },
  { id: 'groups', label: 'Grupos', icon: 'compass', to: '/groups' },
  { id: 'goals', label: 'Metas', icon: 'piggy-bank', to: '/goals' },
  { id: 'profile', label: 'Perfil', icon: 'user', to: '/profile' },
];

export function BottomAppBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[calc(0.85rem+env(safe-area-inset-bottom))] z-50 mx-auto w-[calc(100%-1.5rem)] max-w-[388px] rounded-[24px] border border-white/60 bg-white/90 px-4 pb-3 pt-2.5 shadow-[0_18px_42px_rgba(15,23,42,0.16)] backdrop-blur-xl">
      <div className="pointer-events-auto flex items-end justify-between">
        {items.map((item) => {
          const Icon = navIcons[item.icon];
          const active =
            item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                void navigate({ to: item.to });
              }}
              className={cn(
                'flex w-[78px] flex-col items-center justify-end gap-0.5 rounded-2xl px-1.5 py-1 text-[11px] font-medium leading-4 text-[#94a3b8] transition-colors',
                active && 'text-primary',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex justify-center">
        <span className="h-[4px] w-[118px] rounded-full bg-[#cbd5e1]" />
      </div>
    </nav>
  );
}
