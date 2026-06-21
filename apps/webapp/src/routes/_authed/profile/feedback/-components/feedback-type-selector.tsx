import { AlertCircle, Check, Lightbulb } from 'lucide-react';
import type { FeedbackType } from '../-hooks/use-feedback-page';

const feedbackTypeOptions: Array<{
  value: FeedbackType;
  label: string;
  subtitle: string;
  icon: typeof AlertCircle;
}> = [
  {
    value: 'BUG',
    label: 'Reportar error',
    subtitle: 'Algo no funciona como debería',
    icon: AlertCircle,
  },
  {
    value: 'FEATURE_REQUEST',
    label: 'Pedir funcionalidad',
    subtitle: 'Una mejora o algo nuevo',
    icon: Lightbulb,
  },
];

type FeedbackTypeSelectorProps = {
  value: FeedbackType;
  onChange: (value: FeedbackType) => void;
};

export function FeedbackTypeSelector({
  value,
  onChange,
}: FeedbackTypeSelectorProps) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-[#0f172a]">
          Cuéntanos qué pasó
        </p>
        <p className="mt-1 text-sm leading-6 text-[#64748b]">
          Reporta errores o pide funcionalidades nuevas. Puedes adjuntar
          imágenes si ayudan a explicar mejor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {feedbackTypeOptions.map((option) => {
          const Icon = option.icon;
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex items-start gap-3 rounded-3xl border px-4 py-4 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/5'
                  : 'border-[#e2e8f0] bg-white'
              }`}
            >
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                  active
                    ? 'bg-primary text-white'
                    : 'bg-[#f8fafc] text-[#475569]'
                }`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {option.label}
                  </p>
                  {active ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#64748b]">{option.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
