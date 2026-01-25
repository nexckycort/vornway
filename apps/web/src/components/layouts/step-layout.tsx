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
    <div className={`min-h-screen bg-white flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleBack} className="p-1">
            <HugeiconsIcon
              icon={ChevronLeft}
              className="w-6 h-6 text-gray-700"
            />
          </button>
          <h1 className="text-xl font-semibold text-[#1a1a3e]">{title}</h1>
        </div>
        <span className="text-gray-500 text-sm">
          Paso {currentStep} de {totalSteps}
        </span>
      </div>

      <div className="flex gap-1 px-4 mb-6">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={`step-${index}`}
            className={`flex-1 h-1.5 rounded-full ${
              index < currentStep ? 'bg-[#4040b0]' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 px-4">{children}</div>

      {footer && <div className="p-4 pb-8">{footer}</div>}
    </div>
  );
}
