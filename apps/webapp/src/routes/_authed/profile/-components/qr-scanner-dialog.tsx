import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { Button } from '#/components/ui/button';
import { extractInviteCodeFromQrValue } from '#/lib/invite-code';

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
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const resolvedRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // Ignored on purpose. The scanner may already be stopped.
    }

    try {
      await scanner.clear();
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
          throw new Error('El escáner solo está disponible en el navegador.');
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Tu navegador no soporta lectura de cámara para escanear QR.',
          );
        }

        const { Html5Qrcode } = await import('html5-qrcode');
        const cameras = await Html5Qrcode.getCameras();

        if (!active) return;

        if (cameras.length === 0) {
          throw new Error('No se encontró ninguna cámara disponible.');
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
              setErrorMessage(
                'No se pudo leer un enlace válido desde este QR.',
              );
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
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar la cámara.',
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
          <DialogTitle>Escanear QR</DialogTitle>
          <DialogDescription>
            Apunta la cámara al QR del grupo para abrir su invitación.
          </DialogDescription>
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
                ? 'Buscando un QR válido'
                : status === 'starting'
                  ? 'Iniciando cámara...'
                  : status === 'error'
                    ? 'No se pudo iniciar la cámara'
                    : 'Escáner listo'}
            </p>
            <p className="text-sm leading-6 text-[#64748b]">
              {errorMessage ||
                'Si el grupo te compartió un QR, la app abrirá la invitación automáticamente cuando lo detecte.'}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-full"
            onClick={() => {
              resolvedRef.current = false;
              onOpenChange(false);
            }}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
