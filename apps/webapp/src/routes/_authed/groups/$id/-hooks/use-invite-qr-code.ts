import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function useInviteQrCode(inviteLink: string, width: number) {
  const [qr, setQr] = useState<{
    link: string;
    dataUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!inviteLink) return;
    let active = true;

    void QRCode.toDataURL(inviteLink, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width,
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((dataUrl: string) => {
        if (active) setQr({ link: inviteLink, dataUrl });
      })
      .catch(() => {
        if (active) setQr({ link: inviteLink, dataUrl: null });
      });

    return () => {
      active = false;
    };
  }, [inviteLink, width]);

  return qr?.link === inviteLink ? qr.dataUrl : null;
}
