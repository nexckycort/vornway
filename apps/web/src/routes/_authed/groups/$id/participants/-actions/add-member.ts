/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const AddMemberInputSchema = z.object({
  groupId: z.string(),
  name: z.string().min(1),
});

interface AddMemberResponse {
  success: boolean;
  memberId?: string;
  error?: string;
}

export const addMember = createServerFn({ method: 'POST' })
  .inputValidator(AddMemberInputSchema)
  .handler(async ({ data }): Promise<AddMemberResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const membership = await db.groupMember.findFirst({
        where: { groupId: data.groupId, userId },
      });

      if (!membership) {
        return { success: false, error: 'No tienes acceso a este grupo' };
      }

      const existingMember = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
        },
      });

      if (existingMember) {
        return {
          success: false,
          error: 'Ya existe un participante con ese nombre',
        };
      }

      const newMember = await db.groupMember.create({
        data: {
          groupId: data.groupId,
          name: data.name,
          role: 'member',
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: membership.name,
          action: 'member.added',
          targetName: data.name,
          details: { memberId: newMember.id },
        },
      });

      return { success: true, memberId: newMember.id };
    } catch (error) {
      console.error('Error adding member:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al agregar participante',
      };
    }
  });
