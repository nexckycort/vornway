import { ChevronRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';

export function ProfileActionRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  trailing?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-[#f8fafc]"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0f172a]">{title}</p>
          <p className="text-sm text-[#64748b]">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {trailing ? (
          <span className="text-xs font-medium text-[#64748b]">{trailing}</span>
        ) : null}
        <HugeiconsIcon
          icon={ChevronRightIcon}
          className="size-4 text-[#94a3b8]"
        />
      </div>
    </button>
  );
}
