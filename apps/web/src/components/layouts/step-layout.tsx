import { ChevronLeft } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from '@tanstack/react-router';
import type React from 'react';

interface StepLayoutProps {
  children: React.ReactNode;
  title: string;
  currentStep: number;
  totalSteps: number;
  footer?: React.ReactNode;
  onBack?: () => void;
  className?: string;
}

export function StepLayout({
  children,
  title,
  currentStep,
  totalSteps,
  footer,
  onBack,
  className = '',
}: StepLayoutProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.history.back();
    }
  };

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white/80 backdrop-blur-sm lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:max-w-3xl lg:rounded-3xl lg:border lg:border-white/70 lg:bg-white/85 lg:shadow-[0_24px_60px_-38px_rgba(21,17,52,0.45)] ${className}`}
    >
      <div className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur-xl lg:rounded-t-3xl">
        <div className="flex items-center justify-between px-4 py-4 lg:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f0fb] active:scale-[0.98]"
            >
              <HugeiconsIcon
                icon={ChevronLeft}
                className="w-6 h-6 text-gray-700"
              />
            </button>
            <h1 className="text-xl font-semibold tracking-tight text-[#1a1a3e] lg:text-2xl">
              {title}
            </h1>
          </div>
          <span className="rounded-full bg-[#f2f0fb] px-3 py-1 text-xs font-medium text-gray-600">
            Paso {currentStep} de {totalSteps}
          </span>
        </div>

        <div className="flex gap-1 px-4 pb-4 lg:px-6">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={`step-${index}`}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index < currentStep ? 'bg-[#4040b0]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-4 lg:px-6 lg:pt-6">
        {children}
      </div>

      {footer && (
        <div className="border-t border-black/5 bg-white/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:rounded-b-3xl lg:px-6">
          {footer}
        </div>
      )}
    </div>
  );
}
