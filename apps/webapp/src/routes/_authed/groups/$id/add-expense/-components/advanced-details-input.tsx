import type { InputHTMLAttributes, ReactNode } from 'react';

export function AdvancedDetailsInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  icon?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <div className="mt-2 flex h-12 items-center gap-2 rounded-full border border-gray-200 px-4 focus-within:border-rose-500">
        {icon ? <span className="shrink-0 text-gray-400">{icon}</span> : null}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>
    </label>
  );
}
