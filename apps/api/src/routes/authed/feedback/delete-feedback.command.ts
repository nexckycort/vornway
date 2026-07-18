import { db } from '#/infrastructure/database/connection';
import { feedbackDeleteError, feedbackNotFoundError } from './errors';
import { readFeedbackMetadata } from './feedback.presenter';
import { deleteFeedbackAttachment } from './feedback-attachment.storage';
import type { FeedbackIdParamInput } from './schema';

export async function deleteFeedback(
  input: FeedbackIdParamInput & { userId: string },
) {
  try {
    const existing = await db.userFeedback.findFirst({
      where: {
        id: input.feedbackId,
        userId: input.userId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!existing) {
      throw feedbackNotFoundError();
    }

    const attachments =
      readFeedbackMetadata(existing.metadata).attachments ?? [];

    await Promise.all(
      attachments.map((attachment) =>
        deleteFeedbackAttachment(attachment.url).catch(() => undefined),
      ),
    );

    await db.userFeedback.delete({
      where: { id: existing.id },
    });

    return { success: true as const };
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'FEEDBACK_NOT_FOUND'
    ) {
      throw error;
    }

    throw feedbackDeleteError(error);
  }
}
