import { CalendarDaysIcon, MailIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { formatCurrency } from '#/lib/i18n';

export function StepHeader({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-3xl font-semibold leading-9 text-[#0f172a]">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#64748b]">{copy}</p>
    </div>
  );
}

export function GoalPreviewCard({
  name,
  emoji,
  typeLabel,
  target,
  currency,
  progress,
  accent,
}: {
  name: string;
  emoji: string;
  typeLabel: string;
  target: number;
  currency: string;
  progress: number;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-[#111111] p-5 text-white shadow-[0_20px_45px_rgba(15,23,42,0.22)]">
      <div
        className="absolute -right-10 -top-10 size-36 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex size-14 items-center justify-center rounded-3xl bg-white/10 text-3xl">
          {emoji || '✨'}
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          {typeLabel}
        </span>
      </div>
      <h2 className="relative mt-6 text-2xl font-semibold leading-8">
        {name || 'Nueva meta'}
      </h2>
      <p className="relative mt-2 text-sm text-white/60">
        Objetivo {formatCurrency(currency, target || 0)}
      </p>
      <div className="relative mt-5 h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(3, progress)}%`,
            backgroundColor: accent,
          }}
        />
      </div>
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-3">
      <span className="flex items-center gap-2 text-xs text-[#64748b]">
        <HugeiconsIcon icon={CalendarDaysIcon} className="size-3.5" />
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-sm font-semibold text-[#0f172a] outline-none"
      />
    </label>
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
    <div className="rounded-[24px] border border-[#e2e8f0] bg-white p-4">
      <p className="text-xs text-[#64748b]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#0f172a]">{value}</p>
      <p className="mt-1 text-xs text-[#94a3b8]">{copy}</p>
    </div>
  );
}

export function MemberAvatar({
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
        className="size-10 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="flex size-10 items-center justify-center rounded-full bg-[#f1f5f9] text-sm font-semibold text-[#0f172a]">
      {name.trim().charAt(0).toUpperCase() || (
        <HugeiconsIcon icon={MailIcon} className="size-4" />
      )}
    </span>
  );
}
