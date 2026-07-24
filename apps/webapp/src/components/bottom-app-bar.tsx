import {
  CompassIcon,
  HomeIcon,
  PiggyBankIcon,
  UserGroupIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  useLocation,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { getBottomAppBarMessages } from '#/components/bottom-app-bar.messages';
import { cn } from '#/lib/utils';
export type BottomAppBarIconName =
  | 'compass'
  | 'home'
  | 'piggy-bank'
  | 'user'
  | 'users';

type BottomAppBarItem = {
  id: string;
  label: string;
  icon: BottomAppBarIconName;
  to: '/' | '/expenses/friends' | '/groups' | '/goals' | '/profile';
};

type BottomNavState = {
  bottomNavRoot?: true;
};

const navIcons: Record<BottomAppBarIconName, IconSvgElement> = {
  compass: CompassIcon,
  home: HomeIcon,
  users: UserGroupIcon,
  'piggy-bank': PiggyBankIcon,
  user: UserIcon,
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
  const [isMinimized, setIsMinimized] = useState(false);
  const lastScrollTop = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const items: BottomAppBarItem[] = [
    { id: 'home', label: t.home, icon: 'home', to: '/' },
    {
      id: 'friends',
      label: t.friends,
      icon: 'users',
      to: '/expenses/friends',
    },
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

  useEffect(() => {
    const handleScroll = (event: Event) => {
      if (scrollFrame.current !== null) return;

      scrollFrame.current = window.requestAnimationFrame(() => {
        const scrollElement = event.target;
        const currentScrollTop =
          scrollElement instanceof HTMLElement
            ? scrollElement.scrollTop
            : window.scrollY;
        const scrollDelta = currentScrollTop - lastScrollTop.current;

        if (currentScrollTop < 12 || scrollDelta < -6) {
          setIsMinimized(false);
        } else if (scrollDelta > 6) {
          setIsMinimized(true);
        }

        lastScrollTop.current = Math.max(0, currentScrollTop);
        scrollFrame.current = null;
      });
    };

    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      if (scrollFrame.current !== null) {
        window.cancelAnimationFrame(scrollFrame.current);
      }
    };
  }, []);

  const activeIndex = items.findIndex((item) =>
    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to),
  );

  return (
    <nav
      aria-label={t.ariaLabel}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-[calc(0.85rem+env(safe-area-inset-bottom))] z-50 mx-auto w-[calc(100%-1.5rem)] rounded-[24px] border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.5),rgba(255,255,255,0.18))] shadow-[0_18px_42px_rgba(15,23,42,0.14),inset_0_1px_rgba(255,255,255,0.5)] ring-1 ring-black/[0.02] backdrop-blur-2xl backdrop-saturate-150 transition-[max-width,padding,border-radius] duration-300 ease-out before:pointer-events-none before:absolute before:inset-x-3 before:top-px before:h-px before:rounded-full before:bg-white/75 after:pointer-events-none after:absolute after:inset-x-5 after:bottom-0 after:h-px after:bg-white/20 md:max-w-[980px]',
        isMinimized
          ? 'max-w-[320px] px-2 py-2'
          : 'max-w-[388px] px-4 pb-3 pt-2.5',
      )}
    >
      <div className="pointer-events-auto relative flex items-end justify-between">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1/5 rounded-2xl border border-white/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.6),rgba(255,255,255,0.22))] shadow-[0_5px_14px_rgba(15,23,42,0.1),inset_0_1px_rgba(255,255,255,0.72)] backdrop-blur-xl transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
          }}
        />
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
              aria-current={active ? 'page' : undefined}
              className={cn(
                'native-tap relative z-10 flex min-h-11 min-w-0 flex-1 flex-col items-center justify-end rounded-2xl px-1 py-1 text-[11px] font-medium leading-4 text-[#94a3b8] transition-colors',
                active && 'text-primary',
              )}
            >
              <HugeiconsIcon
                icon={Icon}
                className="size-5"
                aria-hidden="true"
              />
              <span
                className={cn(
                  'max-h-4 overflow-hidden opacity-100 transition-[max-height,opacity,margin] duration-200 ease-out',
                  isMinimized ? 'mt-0 max-h-0 opacity-0' : 'mt-0.5',
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
