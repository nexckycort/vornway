export type GroupCreateDraftImage = {
  dataUrl: string;
  fileName?: string;
};

export type GroupCreateDraft = {
  name: string;
  type: string;
  description: string;
  image: GroupCreateDraftImage | null;
};

const STORAGE_PREFIX = 'vornway:create-group-draft:';
const MAX_GROUP_IMAGE_BYTES = 10 * 1024 * 1024;

export function createGroupDraftId() {
  return crypto.randomUUID();
}

export function saveGroupDraft(draftId: string, draft: GroupCreateDraft) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(storageKey(draftId), JSON.stringify(draft));
}

export function loadGroupDraft(draftId: string): GroupCreateDraft | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(storageKey(draftId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GroupCreateDraft;
  } catch {
    return null;
  }
}

export function clearGroupDraft(draftId: string) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(storageKey(draftId));
}

export async function compressGroupImageFile(file: File): Promise<string> {
  if (file.size > MAX_GROUP_IMAGE_BYTES) {
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

  const maxDimension = 640;
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

  return canvas.toDataURL('image/jpeg', 0.82);
}

function storageKey(draftId: string) {
  return `${STORAGE_PREFIX}${draftId}`;
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
