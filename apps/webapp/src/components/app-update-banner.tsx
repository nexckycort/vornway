import { RefreshCw } from 'lucide-react';
import { useVersionCheck } from '#/hooks/use-version-check';

export function AppUpdateBanner() {
  const { updateAvailable, isUpdating, applyUpdate } = useVersionCheck();

  if (!updateAvailable) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[120] flex justify-center px-4">
      <button
        type="button"
        onClick={() => void applyUpdate()}
        disabled={isUpdating}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white/95 px-3 py-1.5 text-xs font-medium text-[#0f172a] shadow-[0_8px_20px_rgba(15,23,42,0.12)] backdrop-blur disabled:opacity-70"
      >
        <RefreshCw className={`size-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
        <span>{isUpdating ? 'Actualizando...' : 'Actualizar app'}</span>
      </button>
    </div>
  );
}
