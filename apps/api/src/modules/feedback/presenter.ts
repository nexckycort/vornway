import { Option, Schema } from 'effect';
import type { Prisma } from '#/generated/prisma/client';
import { resolveFeedbackAttachmentUrl } from './attachment-url';

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

const StoredAttachment = Schema.Struct({ url: Schema.String });
const StoredMetadata = Schema.Record(Schema.String, Schema.Unknown);

export const readMetadata = (value: Prisma.JsonValue | null) =>
  Option.getOrElse(
    Schema.decodeUnknownOption(StoredMetadata)(value),
    (): Record<string, unknown> => ({}),
  );

export const resolvedAttachments = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        const stored = Schema.decodeUnknownOption(StoredAttachment)(entry);
        if (Option.isNone(stored)) return [];
        const url = resolveFeedbackAttachmentUrl(stored.value.url);
        return url ? [{ url }] : [];
      })
    : [];

export const normalizeFeedbackMetadata = (
  metadata: Record<string, typeof Schema.Json.Type> | undefined,
) => {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) => key !== 'attachments' && key !== 'imageUrls',
    ),
  );
};

export const presentFeedback = (row: FeedbackRow) => {
  const metadata = readMetadata(row.metadata);
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    metadata: Array.isArray(metadata.attachments)
      ? { ...metadata, attachments: resolvedAttachments(metadata.attachments) }
      : metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};
