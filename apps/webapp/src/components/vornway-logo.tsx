import { m } from '#/paraglide/messages.js';

export function VornwayLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.webp"
      alt={m['components.logo.alt']()}
      className={className}
    />
  );
}
