declare module 'html5-qrcode' {
  export type Html5QrcodeCameraDevice = {
    id: string;
    label?: string;
    kind?: string;
  };

  export type Html5QrcodeScanConfig = {
    fps?: number;
    qrbox?: number | { width: number; height: number };
    aspectRatio?: number;
    disableFlip?: boolean;
  };

  export class Html5Qrcode {
    constructor(
      elementId: string,
      options?: boolean | { verbose?: boolean },
    );

    start(
      cameraConfig: string | { facingMode?: 'environment' | 'user' },
      config: Html5QrcodeScanConfig,
      onScanSuccess: (decodedText: string, decodedResult: unknown) => void,
      onScanFailure?: (errorMessage: string, error?: unknown) => void,
    ): Promise<void>;

    stop(): Promise<void>;
    clear(): Promise<void>;

    static getCameras(): Promise<Html5QrcodeCameraDevice[]>;
  }
}
