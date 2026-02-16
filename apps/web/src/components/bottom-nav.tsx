'use client';

import { Clock, Home, LayoutGrid, User } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link, useLocation, useRouter } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/goals', label: 'Metas', icon: LayoutGrid },
  { href: '/activity', label: 'Actividad', icon: Clock },
  { href: '/profile', label: 'Perfil', icon: User },
];

const OPEN_HOME_OPTIONS_EVENT = 'splitway:open-home-options';

export function BottomNav() {
  const router = useRouter();
  const { pathname } = useLocation();
  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  const isItemActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`);

  const triggerPrimaryAction = () => {
    if (pathname === '/') {
      window.dispatchEvent(new Event(OPEN_HOME_OPTIONS_EVENT));
      return;
    }

    try {
      sessionStorage.setItem(OPEN_HOME_OPTIONS_EVENT, '1');
    } catch {}

    router.navigate({ to: '/' });
  };

  const renderMobileItem = (item: (typeof navItems)[number]) => {
    const isActive = isItemActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        to={item.href}
        className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-all duration-200 ${
          isActive
            ? 'bg-[#f1efff] text-[#4040b0]'
            : 'text-gray-400 active:scale-[0.98]'
        }`}
      >
        <HugeiconsIcon
          icon={Icon}
          className={`h-6 w-6 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
          strokeWidth={isActive ? 2.5 : 2}
        />
        <span
          className={`text-[0.68rem] tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/80 bg-white/95 pb-[max(0.3rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_-22px_rgba(19,15,49,0.45)] backdrop-blur-xl lg:hidden">
      <div className="relative mx-auto w-full max-w-md px-3 pt-2">
        <div className="grid grid-cols-5 items-center">
          {leftItems.map(renderMobileItem)}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={triggerPrimaryAction}
              className="flex h-14 w-14 -translate-y-5 items-center justify-center rounded-2xl bg-[#4040b0] text-white shadow-[0_12px_28px_-14px_rgba(64,64,176,0.85)] active:scale-[0.98]"
              aria-label="Acciones rápidas"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>

          {rightItems.map(renderMobileItem)}
        </div>
      </div>
    </nav>
  );
}
