import { m } from '#/paraglide/messages.js';

const SHARED_RECEIPTS_CACHE = 'vornway-shared-receipts-v1';
const SHARED_RECEIPT_PATH = '/__vornway-share-target__/receipt/';
const MAX_SHARED_RECEIPT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_SHARED_RECEIPT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export async function consumeSharedReceipt(
  receiptId: string,
): Promise<File | null> {
  if (!('caches' in window) || !receiptId.trim()) return null;

  const cache = await caches.open(SHARED_RECEIPTS_CACHE);
  const requestUrl = new URL(
    `${SHARED_RECEIPT_PATH}${encodeURIComponent(receiptId)}`,
    window.location.origin,
  ).href;
  const response = await cache.match(requestUrl);
  if (!response) return null;

  await cache.delete(requestUrl);
  const blob = await response.blob();

  if (!ACCEPTED_SHARED_RECEIPT_TYPES.has(blob.type)) {
    throw new Error(m['components.native.sharedReceiptInvalidType']());
  }

  if (blob.size > MAX_SHARED_RECEIPT_BYTES) {
    throw new Error(m['components.native.sharedReceiptTooLarge']());
  }

  const encodedFileName = response.headers.get('X-Vornway-Filename')?.trim();
  const fileName = encodedFileName
    ? decodeURIComponent(encodedFileName)
    : 'receipt-image';
  return new File([blob], fileName, { type: blob.type });
}
