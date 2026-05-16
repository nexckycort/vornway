import {
  Compass,
  Home,
  type LucideIcon,
  PiggyBank,
  UserRound,
} from 'lucide-react';

import { cn } from '#/lib/utils';

export type BottomAppBarIconName = 'compass' | 'home' | 'piggy-bank' | 'user';

export type BottomAppBarItem = {
  id: string;
  label: string;
  icon: BottomAppBarIconName;
  active: boolean;
};

const navIcons: Record<BottomAppBarIconName, LucideIcon> = {
  compass: Compass,
  home: Home,
  'piggy-bank': PiggyBank,
  user: UserRound,
};

type BottomAppBarProps = {
  items: BottomAppBarItem[];
};

export function BottomAppBar({ items }: BottomAppBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[412px] rounded-t-[28px] border-t border-border bg-white px-5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-1px_2.3px_rgba(203,203,203,0.3)]">
      <div className="flex items-end justify-between">
        {items.map((item) => {
          const Icon = navIcons[item.icon];

          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex w-[84px] flex-col items-center justify-end gap-0.5 rounded-xl px-1.5 text-xs font-medium leading-4 text-[#a7a7a7]',
                item.active && 'text-primary',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center">
        <span className="h-[5px] w-[134px] rounded-full bg-[#a7a7a7]" />
      </div>
    </nav>
  );
}
