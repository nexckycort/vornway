import { Spinner } from './ui/spinner';

type FullscreenLoaderProps = {
  label?: string;
};

export function FullscreenLoader({
  label = 'Cargando aplicación',
}: FullscreenLoaderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-white bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <Spinner className="size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#0f172a]">{label}</p>
          <p className="text-sm text-[#64748b]">
            Estamos preparando tu sesión.
          </p>
        </div>
      </div>
    </main>
  );
}
