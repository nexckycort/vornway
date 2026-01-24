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
      className={`min-h-screen bg-gradient-to-b from-[#e8e0f0] via-[#f0ebf5] to-white ${className}`}
    >
      {children}
    </div>
  );
}
