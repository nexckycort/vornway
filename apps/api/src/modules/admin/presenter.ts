import type { Prisma } from '#/generated/prisma/client';
import { resolveUserImageUrl } from '#/infrastructure/storage/image-urls';
import { readMetadata, resolvedAttachments } from '../feedback/presenter';

export const adminFeedbackInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UserFeedbackInclude;

export type AdminFeedbackRow = Prisma.UserFeedbackGetPayload<{
  include: typeof adminFeedbackInclude;
}>;

export const presentAdminFeedback = (row: AdminFeedbackRow) => {
  const metadata = readMetadata(row.metadata);
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    metadata: {
      ...metadata,
      attachments: resolvedAttachments(metadata.attachments),
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      image: resolveUserImageUrl(row.user.image, row.user.updatedAt),
    },
  };
};
