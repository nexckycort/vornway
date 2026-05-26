import { WifiOff } from 'lucide-react';
import { useNetworkState } from '#/hooks/use-network-state';
import { getSharedComponentMessages } from './-messages';

export function NetworkOfflineBanner() {
  const network = useNetworkState();
  const t = getSharedComponentMessages();

  if (network.online) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex justify-center px-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#fda4af] bg-white/90 px-3 py-1.5 text-xs font-medium text-[#9f1239] shadow-[0_8px_20px_rgba(225,29,72,0.15)] backdrop-blur">
        <WifiOff className="size-3.5" />
        <span>{t.network.offline}</span>
      </div>
    </div>
  );
}
