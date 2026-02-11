/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const UpdateGoalMemberRoleInputSchema = z.object({
  groupId: z.string(),
  memberId: z.string(),
  role: z.enum(['admin', 'member']),
});

interface UpdateGoalMemberRoleResponse {
  success: boolean;
  error?: string;
}

export const updateGoalMemberRole = createServerFn({ method: 'POST' })
  .inputValidator(UpdateGoalMemberRoleInputSchema)
  .handler(async ({ data }): Promise<UpdateGoalMemberRoleResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const actorMember = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!actorMember) {
        return { success: false, error: 'No tienes acceso a esta meta' };
      }

      if (actorMember.role !== 'admin') {
        return { success: false, error: 'Solo un admin puede cambiar roles' };
      }

      const targetMember = await db.groupMember.findFirst({
        where: {
          id: data.memberId,
          groupId: data.groupId,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!targetMember) {
        return { success: false, error: 'Participante no encontrado' };
      }

      if (targetMember.role === data.role) {
        return { success: true };
      }

      if (targetMember.role === 'admin' && data.role === 'member') {
        const otherAdminCount = await db.groupMember.count({
          where: {
            groupId: data.groupId,
            role: 'admin',
            id: {
              not: targetMember.id,
            },
          },
        });

        if (otherAdminCount === 0) {
          return {
            success: false,
            error: 'Debe existir al menos un admin en la meta',
          };
        }
      }

      await db.groupMember.update({
        where: {
          id: targetMember.id,
        },
        data: {
          role: data.role,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: actorMember.name,
          action: 'member.role.updated',
          targetName: targetMember.name,
          details: {
            memberId: targetMember.id,
            previousRole: targetMember.role,
            nextRole: data.role,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating goal member role:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el rol',
      };
    }
  });
