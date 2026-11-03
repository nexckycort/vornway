import { useRef, useState } from 'react';
import { compressImageFileToDataUrl } from '#/lib/image-compression';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { ExpenseRecord } from '../-lib/initial-values';

type UseExpenseAttachmentOptions = {
  expense: ExpenseRecord | undefined;
  groupMessages: ReturnType<typeof getGroupDetailMessages>;
};

export function useExpenseAttachment({
  expense,
  groupMessages,
}: UseExpenseAttachmentOptions) {
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | null>(
    null,
  );
  const attachmentFileNameRef = useRef<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentPreviewUrl =
    attachmentDataUrl ??
    ((expense as { attachmentUrl?: string | null } | undefined)
      ?.attachmentUrl ||
      null);

  const handleAttachmentSelect = async (file: File | null) => {
    if (!file) return;

    setAttachmentError(null);

    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setAttachmentDataUrl(dataUrl);
      attachmentFileNameRef.current = file.name;
    } catch (selectionError) {
      setAttachmentDataUrl(null);
      attachmentFileNameRef.current = null;
      setAttachmentError(
        selectionError instanceof Error
          ? selectionError.message
          : groupMessages.form.imageProcessFailed,
      );
    } finally {
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
  };

  const clearAttachmentSelection = () => {
    setAttachmentDataUrl(null);
    attachmentFileNameRef.current = null;
    setAttachmentError(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  return {
    attachmentDataUrl,
    attachmentError,
    attachmentFileNameRef,
    attachmentInputRef,
    attachmentPreviewUrl,
    clearAttachmentSelection,
    handleAttachmentSelect,
    setAttachmentDataUrl,
    setAttachmentError,
  };
}
