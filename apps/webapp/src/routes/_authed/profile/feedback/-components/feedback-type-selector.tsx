import { AlertCircle, Check, Lightbulb } from 'lucide-react';
import { getProfileMessages } from '#/routes/_authed/profile/-messages';
import type { FeedbackType } from '../-hooks/use-feedback-page';

const feedbackTypeOptions: Array<{
  value: FeedbackType;
  icon: typeof AlertCircle;
}> = [
  {
    value: 'BUG',
    icon: AlertCircle,
  },
  {
    value: 'FEATURE_REQUEST',
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
  const t = getProfileMessages();

  return (
    <section className="space-y-3">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-[#0f172a]">
          {t.feedback.selectorTitle}
        </p>
        <p className="mt-1 text-sm leading-6 text-[#64748b]">
          {t.feedback.selectorCopy}
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
                    {getFeedbackTypeLabel(option.value, t)}
                  </p>
                  {active ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#64748b]">
                  {getFeedbackTypeSubtitle(option.value, t)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function getFeedbackTypeLabel(
  type: FeedbackType,
  t: ReturnType<typeof getProfileMessages>,
) {
  return type === 'BUG' ? t.reportBug : t.requestFeature;
}

function getFeedbackTypeSubtitle(
  type: FeedbackType,
  t: ReturnType<typeof getProfileMessages>,
) {
  return type === 'BUG' ? t.feedback.bugSubtitle : t.feedback.featureSubtitle;
}
