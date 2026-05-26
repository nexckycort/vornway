import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { extractInviteCodeFromQrValue } from '#/lib/invite-code';
import { getProfileMessages } from '#/routes/_authed/profile/-messages';

type QrScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (inviteCode: string) => void | Promise<void>;
};

type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'error';

type Html5QrcodeInstance = {
  stop: () => Promise<void>;
  clear: () => Promise<void>;
};

export function QrScannerDialog({
  open,
  onOpenChange,
  onScanned,
}: QrScannerDialogProps) {
  const t = getProfileMessages();
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const resolvedRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // Ignored on purpose. The scanner may already be stopped.
    }

    try {
      await scanner.clear();
      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }
    } catch {
      // Ignored on purpose. The scanner may already be disposed.
    }
  }, []);

  useEffect(() => {
    if (!open) {
      resolvedRef.current = false;
      setStatus('idle');
      setErrorMessage(null);
      void stopScanner();
      return;
    }

    let active = true;
    setStatus('starting');
    setErrorMessage(null);

    void (async () => {
      try {
        if (typeof window === 'undefined') {
          throw new Error(t.qrDialog.browserOnly);
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(t.qrDialog.unsupported);
        }

        const { Html5Qrcode } = await import('html5-qrcode');
        const cameras = await Html5Qrcode.getCameras();

        if (!active) return;

        if (cameras.length === 0) {
          throw new Error(t.qrDialog.noCamera);
        }

        const scanner = new Html5Qrcode('profile-qr-scanner', {
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            disableFlip: true,
          },
          async (decodedText) => {
            if (resolvedRef.current) return;

            const inviteCode = extractInviteCodeFromQrValue(decodedText);
            if (!inviteCode) {
              setErrorMessage(t.qrDialog.invalidQr);
              return;
            }

            resolvedRef.current = true;
            await stopScanner();
            onOpenChange(false);
            await onScanned(inviteCode);
          },
          () => {
            // Ignorado. Los errores de lectura se producen muchas veces por segundo.
          },
        );

        if (!active) {
          await stopScanner();
          return;
        }

        setStatus('scanning');
      } catch (error) {
        if (!active) return;

        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : t.qrDialog.cameraStartFailed,
        );
      }
    })();

    return () => {
      active = false;
      void stopScanner();
    };
  }, [onOpenChange, onScanned, open, stopScanner]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resolvedRef.current = false;
          setStatus('idle');
          setErrorMessage(null);
          void stopScanner();
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-[28px] p-4 sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t.qrDialog.title}</DialogTitle>
          <DialogDescription>{t.qrDialog.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-3xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div
              id="profile-qr-scanner"
              className="min-h-[280px] overflow-hidden rounded-2xl bg-black"
            />
          </div>

          <div className="space-y-2 rounded-3xl border border-[#e2e8f0] bg-white p-4">
            <p className="text-sm font-semibold text-[#0f172a]">
              {status === 'scanning'
                ? t.qrDialog.searching
                : status === 'starting'
                  ? t.qrDialog.starting
                  : status === 'error'
                    ? t.qrDialog.cameraStartFailed
                    : t.qrDialog.ready}
            </p>
            <p className="text-sm leading-6 text-[#64748b]">
              {errorMessage || t.qrDialog.readyCopy}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-full"
            onClick={() => {
              resolvedRef.current = false;
              void stopScanner();
              onOpenChange(false);
            }}
          >
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
