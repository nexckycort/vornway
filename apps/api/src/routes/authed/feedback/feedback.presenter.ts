import type { Prisma } from '#/generated/prisma/client';
import { resolveFeedbackAttachmentUrl } from './feedback-attachment.storage';
import type { UserFeedbackItem, UserFeedbackMetadata } from './schema';

export const feedbackSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserFeedbackSelect;

export type FeedbackRow = Prisma.UserFeedbackGetPayload<{
  select: typeof feedbackSelect;
}>;

export function normalizeFeedbackMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) return {};

  const next = { ...metadata };
  delete next.attachments;
  delete next.imageUrls;
  return next;
}

export function readFeedbackMetadata(
  metadata: Prisma.JsonValue | null,
): UserFeedbackMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const parsed = metadata as UserFeedbackMetadata;
  const attachments = parsed.attachments?.flatMap((attachment) => {
    const resolvedUrl = resolveFeedbackAttachmentUrl(attachment.url);
    return resolvedUrl ? [{ url: resolvedUrl }] : [];
  });

  return {
    ...parsed,
    ...(attachments ? { attachments } : {}),
  };
}

export function presentFeedback(row: FeedbackRow): UserFeedbackItem {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    metadata: readFeedbackMetadata(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
