import type { ReactNode } from 'react';

export function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/10 px-3 py-3 backdrop-blur">
      <p className="text-[11px] text-white/55">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function HeaderAction({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-1 transition-transform active:scale-[0.98]"
    >
      <span
        className={[
          'flex h-9 w-full items-center justify-center rounded-xl text-white transition-colors',
          primary
            ? 'bg-[#ff4d6a] shadow-[0_8px_18px_rgba(255,77,106,0.35)]'
            : 'bg-white/10',
        ].join(' ')}
      >
        {icon}
      </span>
      <span className="max-w-full truncate text-center text-[11px] font-medium text-white/85">
        {label}
      </span>
    </button>
  );
}

export function SectionHeader({
  title,
  copy,
  count,
}: {
  title: string;
  copy: string;
  count?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-[#64748b]">{copy}</p>
      </div>
      {count ? (
        <span className="shrink-0 rounded-full bg-[#f8fafc] px-3 py-1 text-xs text-[#64748b]">
          {count}
        </span>
      ) : null}
    </div>
  );
}

export function EmptyCard({
  icon,
  title,
  copy,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="mt-4 rounded-[24px] border border-dashed border-[#dbe3ef] bg-[#fafafa] px-4 py-7 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-primary">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-[#0f172a]">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-[#64748b]">
        {copy}
      </p>
    </div>
  );
}

export function InsightCard({
  label,
  value,
  copy,
}: {
  label: string;
  value: string;
  copy: string;
}) {
  return (
    <div className="rounded-[26px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <p className="text-xs text-[#64748b]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-[#0f172a]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[#94a3b8]">{copy}</p>
    </div>
  );
}

export function Avatar({
  name,
  image,
}: {
  name: string;
  image?: string | null;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="size-11 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-sm font-semibold text-[#0f172a]">
      {name.trim().charAt(0).toUpperCase() || 'M'}
    </span>
  );
}

export function GoalDetailSkeleton() {
  return (
    <div className="-mx-4 flex flex-1 flex-col gap-4 bg-[#f4f5f7] p-4">
      <div className="h-72 animate-pulse rounded-[34px] bg-[#111111]/90" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-20 animate-pulse rounded-[24px] bg-white" />
        <div className="h-20 animate-pulse rounded-[24px] bg-white" />
        <div className="h-20 animate-pulse rounded-[24px] bg-white" />
      </div>
      <div className="h-52 animate-pulse rounded-[30px] bg-white" />
      <div className="h-64 animate-pulse rounded-[30px] bg-white" />
    </div>
  );
}
