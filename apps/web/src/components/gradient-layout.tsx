import type React from 'react';

interface GradientLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientLayout({
  children,
  className = '',
}: GradientLayoutProps) {
  return (
    <div
      className={`native-app-shell min-h-dvh bg-[linear-gradient(180deg,#e8e0f0_0%,#f0ebf5_14%,rgba(255,255,255,0.95)_28%,#ffffff_40%)] ${className}`}
    >
      <div className="native-screen mx-auto min-h-dvh w-full max-w-md lg:max-w-6xl lg:px-6 xl:px-10">
        {children}
      </div>
    </div>
  );
}
