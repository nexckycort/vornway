const ASSET_BASE_URL = 'https://assets.vornway.com';
export const FEEDBACK_ATTACHMENT_FOLDER = 'feedback';
const ATTACHMENT_PREFIX = `/${FEEDBACK_ATTACHMENT_FOLDER}/`;

export const resolveFeedbackAttachmentUrl = (
  attachmentPathOrUrl: string | null | undefined,
) => {
  if (!attachmentPathOrUrl) return null;
  if (attachmentPathOrUrl.startsWith('https://')) return attachmentPathOrUrl;
  if (attachmentPathOrUrl.startsWith('/')) {
    return `${ASSET_BASE_URL}${attachmentPathOrUrl}`;
  }
  return `${ASSET_BASE_URL}/${attachmentPathOrUrl}`;
};

export const feedbackAttachmentKey = (
  attachmentPathOrUrl: string | null | undefined,
) => {
  if (!attachmentPathOrUrl) return null;
  if (attachmentPathOrUrl.startsWith('/')) {
    return attachmentPathOrUrl.startsWith(ATTACHMENT_PREFIX)
      ? attachmentPathOrUrl.slice(1)
      : null;
  }
  if (!attachmentPathOrUrl.startsWith(ASSET_BASE_URL)) return null;
  const url = URL.canParse(attachmentPathOrUrl)
    ? new URL(attachmentPathOrUrl)
    : null;
  return url?.pathname.startsWith(ATTACHMENT_PREFIX)
    ? url.pathname.slice(1)
    : null;
};
