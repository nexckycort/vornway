'use client';

import { Clock, Home, LayoutGrid, User } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link, useLocation } from '@tanstack/react-router';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/goals', label: 'Metas', icon: LayoutGrid },
  { href: '/activity', label: 'Actividad', icon: Clock },
  { href: '/profile', label: 'Perfil', icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 px-4">
      <div className="mx-auto flex w-full max-w-md items-center justify-around rounded-[1.75rem] border border-white/70 bg-white/85 px-3 py-2 shadow-[0_18px_40px_-24px_rgba(19,15,49,0.55)] backdrop-blur-xl">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-all duration-200 ${
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
        })}
      </div>
    </nav>
  );
}
