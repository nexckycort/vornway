'use client';

import { Clock, Home, User } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link, useLocation } from '@tanstack/react-router';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/activity', label: 'Actividad', icon: Clock },
  { href: '/profile', label: 'Perfil', icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2 pb-6">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2 px-4 ${
                isActive ? 'text-[#4040b0]' : 'text-gray-400'
              }`}
            >
              <HugeiconsIcon
                icon={Icon}
                className="w-6 h-6"
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}
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
