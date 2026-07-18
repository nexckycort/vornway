import { db } from '#/infrastructure/database/connection';
import { feedbackListError } from './errors';
import { feedbackSelect, presentFeedback } from './feedback.presenter';
import type { ListFeedbackQueryInput, ListFeedbackResult } from './schema';

export async function listFeedbackForUser(
  input: ListFeedbackQueryInput & { userId: string },
): Promise<ListFeedbackResult> {
  try {
    const where = { userId: input.userId };

    const [rows, total] = await Promise.all([
      db.userFeedback.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(input.cursor
          ? {
              cursor: { id: input.cursor },
              skip: 1,
            }
          : {}),
        take: input.limit + 1,
        select: feedbackSelect,
      }),
      db.userFeedback.count({ where }),
    ]);

    const hasNextPage = rows.length > input.limit;
    const data = hasNextPage ? rows.slice(0, input.limit) : rows;
    const nextCursor = hasNextPage ? (data.at(-1)?.id ?? null) : null;

    return {
      data: data.map(presentFeedback),
      pagination: {
        limit: input.limit,
        total,
        nextCursor,
      },
    };
  } catch (error) {
    throw feedbackListError(error);
  }
}
