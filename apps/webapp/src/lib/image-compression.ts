const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 640;
const DEFAULT_QUALITY = 0.82;

export async function compressImageFileToDataUrl(
  file: File,
  options?: {
    maxBytes?: number;
    maxDimension?: number;
    quality?: number;
  },
): Promise<string> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  if (file.size > maxBytes) {
    throw new Error('La imagen no puede superar 10 MB');
  }

  if (
    typeof createImageBitmap === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return readFileAsDataUrl(file);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return readFileAsDataUrl(file);
  }

  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width || 1, bitmap.height || 1),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('No se pudo procesar la imagen');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No se pudo leer la imagen'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}
