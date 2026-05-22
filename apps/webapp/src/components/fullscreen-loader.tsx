import { Spinner } from './ui/spinner';

type FullscreenLoaderProps = {
  label?: string;
};

export function FullscreenLoader({
  label = 'Cargando aplicación',
}: FullscreenLoaderProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#ffe8f0_0%,#f8fafc_48%,#edf4ff_100%)] px-4">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-20 top-14 size-56 rounded-full bg-[#ffd6e2] blur-3xl" />
        <div className="absolute -right-16 bottom-12 size-52 rounded-full bg-[#d9e7ff] blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-xs flex-col items-center gap-5 rounded-[28px] border border-white/70 bg-white/85 px-6 py-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className="relative flex size-[74px] items-center justify-center rounded-3xl bg-[#fff1f6] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)]">
          <div className="absolute inset-0 animate-pulse rounded-3xl bg-[#ff4d6a]/10" />
          <Spinner className="relative z-10 size-7 text-[#ff4d6a]" />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold tracking-tight text-[#0f172a]">
            {label}
          </p>
          <p className="text-sm leading-5 text-[#64748b]">
            Estamos preparando tu sesión.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="size-1.5 animate-bounce rounded-full bg-[#ff4d6a] [animation-delay:-0.2s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-[#ff4d6a] [animation-delay:-0.1s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-[#ff4d6a]" />
        </div>
      </div>
    </main>
  );
}
