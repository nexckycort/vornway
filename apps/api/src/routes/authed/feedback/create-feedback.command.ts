import type { Prisma } from '#/generated/prisma/client';
import { db } from '#/infrastructure/database/connection';
import { feedbackCreateError } from './errors';
import {
  feedbackSelect,
  normalizeFeedbackMetadata,
  presentFeedback,
} from './feedback.presenter';
import { uploadFeedbackAttachment } from './feedback-attachment.storage';
import type {
  CreateFeedbackInput,
  UserFeedbackItem,
  UserFeedbackMetadata,
} from './schema';

export async function createFeedback(
  input: CreateFeedbackInput & { userId: string },
): Promise<UserFeedbackItem> {
  const baseMetadata = normalizeFeedbackMetadata(input.metadata);
  const normalizedPriority = input.priority?.trim() || null;

  try {
    const created = await db.userFeedback.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title.trim(),
        description: input.description.trim(),
        ...(normalizedPriority ? { priority: normalizedPriority } : {}),
        metadata: baseMetadata as Prisma.InputJsonValue,
      },
      select: feedbackSelect,
    });

    if (!input.images?.length) {
      return presentFeedback(created);
    }

    const attachments = await Promise.all(
      input.images.map(async (image, index) => ({
        url: await uploadFeedbackAttachment({
          userId: input.userId,
          feedbackId: created.id,
          index,
          dataUrl: image.dataUrl,
        }),
      })),
    );

    const updatedMetadata = {
      ...baseMetadata,
      attachments,
    } satisfies UserFeedbackMetadata;

    const updated = await db.userFeedback.update({
      where: { id: created.id },
      data: {
        metadata: updatedMetadata as Prisma.InputJsonValue,
      },
      select: feedbackSelect,
    });

    return presentFeedback(updated);
  } catch (error) {
    throw feedbackCreateError(error);
  }
}
