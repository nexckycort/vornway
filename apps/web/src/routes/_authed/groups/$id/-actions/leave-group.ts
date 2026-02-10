/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const LeaveGroupInputSchema = z.object({
  groupId: z.string(),
});

interface LeaveGroupResponse {
  success: boolean;
  error?: string;
}

export const leaveGroup = createServerFn({ method: 'POST' })
  .inputValidator(LeaveGroupInputSchema)
  .handler(async ({ data }): Promise<LeaveGroupResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      const group = await db.group.findUnique({
        where: {
          id: data.groupId,
        },
        select: {
          id: true,
          ownerId: true,
        },
      });

      if (!group) {
        return {
          success: false,
          error: 'Grupo no encontrado',
        };
      }

      if (group.ownerId === userId) {
        return {
          success: false,
          error: 'El creador no puede abandonar el grupo. Debe eliminarlo.',
        };
      }

      const membership = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!membership) {
        return {
          success: false,
          error: 'No eres miembro de este grupo',
        };
      }

      await db.groupMember.update({
        where: {
          id: membership.id,
        },
        data: {
          userId: null,
          role: 'member',
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: membership.name,
          action: 'member.left',
          targetName: membership.name,
          details: {
            memberId: membership.id,
          },
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error leaving group:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo abandonar el grupo',
      };
    }
  });
