import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { db } from '#/infrastructure/database/connection';
import { resolveFeedbackAttachmentUrl } from '#/modules/feedback/attachment.service';
import type { AppContext } from '#/shared/types/app';
import { resolveUserImageUrl } from '../users/user-image.service';

const listAdminFeedbackQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
});

const adminFeedbackParamsSchema = z.object({
  feedbackId: z.string().trim().min(1),
});

const updateAdminFeedbackSchema = z
  .object({
    status: z
      .enum(['OPEN', 'IN_REVIEW', 'PLANNED', 'DONE', 'REJECTED'])
      .optional(),
    priority: z.string().trim().max(80).nullable().optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.priority !== undefined,
    {
      message: 'Debes enviar al menos un cambio',
    },
  );

const app = new Hono<AppContext>()
  .get('/stats', async (c) => {
    const [totalUsers, totalGroups] = await Promise.all([
      db.user.count(),
      db.group.count(),
    ]);

    return c.json({
      totalUsers,
      totalGroups,
    });
  })
  .get(
    '/feedback',
    zValidator('query', listAdminFeedbackQuerySchema),
    async (c) => {
      const query = c.req.valid('query');
      const safeLimit = query.limit;

      const [rows, total] = await Promise.all([
        db.userFeedback.findMany({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...(query.cursor
            ? {
                skip: 1,
                cursor: { id: query.cursor },
              }
            : {}),
          take: safeLimit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                updatedAt: true,
              },
            },
          },
        }),
        db.userFeedback.count(),
      ]);

      const nextCursor =
        rows.length === safeLimit ? (rows[rows.length - 1]?.id ?? null) : null;

      return c.json({
        data: rows.map((row) => {
          const metadata =
            row.metadata &&
            typeof row.metadata === 'object' &&
            !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : {};
          const attachments = Array.isArray(metadata.attachments)
            ? metadata.attachments.flatMap((attachment) => {
                if (
                  !attachment ||
                  typeof attachment !== 'object' ||
                  !('url' in attachment) ||
                  typeof attachment.url !== 'string'
                ) {
                  return [];
                }

                const resolvedUrl = resolveFeedbackAttachmentUrl(
                  attachment.url,
                );
                return resolvedUrl ? [{ url: resolvedUrl }] : [];
              })
            : [];

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
              attachments,
            },
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            user: {
              id: row.user.id,
              name: row.user.name,
              email: row.user.email,
              image: resolveUserImageUrl(row.user.image, row.user.updatedAt),
            },
          };
        }),
        pagination: {
          limit: safeLimit,
          total,
          nextCursor,
        },
      });
    },
  )
  .patch(
    '/feedback/:feedbackId',
    zValidator('param', adminFeedbackParamsSchema),
    zValidator('json', updateAdminFeedbackSchema),
    async (c) => {
      const { feedbackId } = c.req.valid('param');
      const body = c.req.valid('json');

      const existing = await db.userFeedback.findUnique({
        where: { id: feedbackId },
        select: { id: true },
      });

      if (!existing) {
        return c.json({ error: 'Reporte no encontrado' }, 404);
      }

      const updated = await db.userFeedback.update({
        where: { id: feedbackId },
        data: {
          ...(body.status ? { status: body.status } : {}),
          ...(body.priority !== undefined
            ? { priority: body.priority?.trim() || null }
            : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              updatedAt: true,
            },
          },
        },
      });

      const metadata =
        updated.metadata &&
        typeof updated.metadata === 'object' &&
        !Array.isArray(updated.metadata)
          ? (updated.metadata as Record<string, unknown>)
          : {};
      const attachments = Array.isArray(metadata.attachments)
        ? metadata.attachments.flatMap((attachment) => {
            if (
              !attachment ||
              typeof attachment !== 'object' ||
              !('url' in attachment) ||
              typeof attachment.url !== 'string'
            ) {
              return [];
            }

            const resolvedUrl = resolveFeedbackAttachmentUrl(attachment.url);
            return resolvedUrl ? [{ url: resolvedUrl }] : [];
          })
        : [];

      return c.json({
        id: updated.id,
        userId: updated.userId,
        type: updated.type,
        title: updated.title,
        description: updated.description,
        status: updated.status,
        priority: updated.priority,
        metadata: {
          ...metadata,
          attachments,
        },
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        user: {
          id: updated.user.id,
          name: updated.user.name,
          email: updated.user.email,
          image: resolveUserImageUrl(
            updated.user.image,
            updated.user.updatedAt,
          ),
        },
      });
    },
  );

export default app;
