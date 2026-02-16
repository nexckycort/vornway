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

export function DesktopSidebar() {
  const router = useRouter();
  const { pathname } = useLocation();

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

  return (
    <aside className="fixed inset-y-6 left-6 z-40 hidden w-56 rounded-3xl border border-white/80 bg-white/92 p-3 shadow-[0_24px_45px_-30px_rgba(17,14,43,0.55)] backdrop-blur-xl lg:flex lg:flex-col">
      <div className="mb-3 px-3 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Navegacion
        </p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = isItemActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isActive
                  ? 'bg-[#f1efff] text-[#4040b0]'
                  : 'text-gray-500 hover:bg-white hover:text-[#1a1a3e]'
              }`}
            >
              <HugeiconsIcon
                icon={Icon}
                className="h-5 w-5"
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={triggerPrimaryAction}
          className="flex w-full items-center gap-3 rounded-xl bg-[#4040b0] px-3 py-2.5 text-white shadow-[0_10px_24px_-14px_rgba(64,64,176,0.85)] hover:brightness-105"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-semibold">Acciones rápidas</span>
        </button>
      </div>
    </aside>
  );
}
