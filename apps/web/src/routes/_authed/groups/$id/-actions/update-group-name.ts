/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const UpdateGroupNameInputSchema = z.object({
  groupId: z.string(),
  name: z.string().trim().min(1).max(80),
});

interface UpdateGroupNameResponse {
  success: boolean;
  name?: string;
  error?: string;
}

export const updateGroupName = createServerFn({ method: 'POST' })
  .inputValidator(UpdateGroupNameInputSchema)
  .handler(async ({ data }): Promise<UpdateGroupNameResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const group = await db.group.findUnique({
        where: { id: data.groupId },
        select: {
          ownerId: true,
          name: true,
        },
      });

      if (!group) {
        return { success: false, error: 'Grupo no encontrado' };
      }

      if (group.ownerId !== userId) {
        return {
          success: false,
          error: 'Solo el creador del grupo puede cambiar el nombre',
        };
      }

      const nextName = data.name.trim();
      if (nextName === group.name) {
        return { success: true, name: group.name };
      }

      await db.group.update({
        where: { id: data.groupId },
        data: {
          name: nextName,
          updatedAt: new Date(),
        },
      });

      const actorMember = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId,
        },
        select: { name: true },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: actorMember?.name ?? session.data.name ?? 'Usuario',
          action: 'group.renamed',
          targetName: nextName,
          details: {
            previousName: group.name,
          },
        },
      });

      return { success: true, name: nextName };
    } catch (error) {
      console.error('Error updating group name:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error al actualizar nombre',
      };
    }
  });
