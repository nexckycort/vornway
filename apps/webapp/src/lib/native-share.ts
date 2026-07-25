export type NativeShareContent = {
  title?: string;
  text?: string;
  url?: string;
};

export type NativeShareResult = 'shared' | 'copied' | 'cancelled';

export async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('CLIPBOARD_UNAVAILABLE');
  }

  await navigator.clipboard.writeText(value);
}

export async function shareOrCopy(
  content: NativeShareContent,
): Promise<NativeShareResult> {
  if (navigator.share) {
    try {
      await navigator.share(content);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      throw error;
    }
  }

  const fallback = content.url ?? content.text ?? content.title;
  if (!fallback) {
    throw new Error('EMPTY_SHARE_CONTENT');
  }

  await copyText(fallback);
  return 'copied';
}
