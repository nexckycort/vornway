/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const RemoveGoalMemberInputSchema = z.object({
  groupId: z.string(),
  memberId: z.string(),
});

interface RemoveGoalMemberResponse {
  success: boolean;
  error?: string;
}

export const removeGoalMember = createServerFn({ method: 'POST' })
  .inputValidator(RemoveGoalMemberInputSchema)
  .handler(async ({ data }): Promise<RemoveGoalMemberResponse> => {
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
        return {
          success: false,
          error: 'Solo un admin puede eliminar participantes',
        };
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
          userId: true,
        },
      });

      if (!targetMember) {
        return { success: false, error: 'Participante no encontrado' };
      }

      if (targetMember.id === actorMember.id) {
        return {
          success: false,
          error: 'No puedes eliminarte a ti mismo',
        };
      }

      if (targetMember.role === 'admin') {
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

      const [createdGoalsCount, contributionsCount] = await Promise.all([
        db.goal.count({
          where: {
            groupId: data.groupId,
            createdByMemberId: targetMember.id,
            deletedAt: null,
          },
        }),
        db.goalContribution.count({
          where: {
            memberId: targetMember.id,
            goal: {
              groupId: data.groupId,
            },
          },
        }),
      ]);

      if (createdGoalsCount > 0) {
        return {
          success: false,
          error:
            'No puedes eliminar este participante porque tiene objetivos creados',
        };
      }

      if (contributionsCount > 0) {
        return {
          success: false,
          error:
            'No puedes eliminar este participante porque tiene aportes registrados',
        };
      }

      await db.groupMember.delete({
        where: {
          id: targetMember.id,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: actorMember.name,
          action: 'member.removed',
          targetName: targetMember.name,
          details: {
            memberId: targetMember.id,
            removedUserId: targetMember.userId,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing goal member:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el participante',
      };
    }
  });
