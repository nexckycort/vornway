import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import type React from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  goBack?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  goBack = true,
  children,
  className = '',
}: PageHeaderProps) {
  const { history } = useRouter();

  return (
    <div className={`native-app-shell min-h-dvh bg-[#F2F4FF] ${className}`}>
      <div className="p-0 pt-2">
        <div className="flex items-center gap-3 px-3 py-2.5">
          {goBack ? (
            <button
              type="button"
              onClick={() => history.back()}
              aria-label="Volver"
              className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#ffffff]"
            >
              <ChevronLeft className="h-5 w-5 text-[#1a1a3e]" />
            </button>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate font-bold text-sm leading-[1.05] font-semibold tracking-tight text-black">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-xs font-normal leading-5 text-[#585f70]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
