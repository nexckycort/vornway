import {
  useLocation,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import {
  Compass,
  Home,
  type LucideIcon,
  PiggyBank,
  UserRound,
} from 'lucide-react';

import { getBottomAppBarMessages } from '#/components/bottom-app-bar.messages';
import { cn } from '#/lib/utils';

export type BottomAppBarIconName = 'compass' | 'home' | 'piggy-bank' | 'user';

type BottomAppBarItem = {
  id: string;
  label: string;
  icon: BottomAppBarIconName;
  to: '/' | '/groups' | '/goals' | '/profile';
};

type BottomNavState = {
  bottomNavRoot?: true;
};

const navIcons: Record<BottomAppBarIconName, LucideIcon> = {
  compass: Compass,
  home: Home,
  'piggy-bank': PiggyBank,
  user: UserRound,
};

export function BottomAppBar() {
  const t = getBottomAppBarMessages();
  const navigate = useNavigate();
  const router = useRouter();
  const location = useLocation();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const hasBottomNavRoot =
    (location.state as BottomNavState).bottomNavRoot === true;
  const bottomNavState = { bottomNavRoot: true } as never;
  const items: BottomAppBarItem[] = [
    { id: 'home', label: t.home, icon: 'home', to: '/' },
    { id: 'groups', label: t.groups, icon: 'compass', to: '/groups' },
    { id: 'goals', label: t.goals, icon: 'piggy-bank', to: '/goals' },
    { id: 'profile', label: t.profile, icon: 'user', to: '/profile' },
  ];

  const navigateToTab = async (to: BottomAppBarItem['to']) => {
    if (to === '/') {
      if (pathname !== '/' && hasBottomNavRoot) {
        router.history.back();
        return;
      }

      await navigate({ to: '/', replace: true });
      return;
    }

    if (pathname === '/') {
      await navigate({ to, state: bottomNavState });
      return;
    }

    if (hasBottomNavRoot) {
      await navigate({ to, replace: true, state: bottomNavState });
      return;
    }

    if (pathname !== '/') {
      await navigate({ to: '/', replace: true });
    }

    await navigate({ to, state: bottomNavState });
  };

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[calc(0.85rem+env(safe-area-inset-bottom))] z-50 mx-auto w-[calc(100%-1.5rem)] max-w-[388px] md:max-w-[980px] rounded-[24px] border border-white/60 bg-white/90 px-4 pb-3 pt-2.5 shadow-[0_18px_42px_rgba(15,23,42,0.16)] backdrop-blur-xl">
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
                void navigateToTab(item.to);
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
    </nav>
  );
}
