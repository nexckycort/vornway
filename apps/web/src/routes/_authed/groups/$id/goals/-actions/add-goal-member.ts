/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const AddGoalMemberInputSchema = z.object({
  groupId: z.string(),
  name: z.string().min(1),
  userId: z.string().optional(),
});

interface AddGoalMemberResponse {
  success: boolean;
  memberId?: string;
  error?: string;
}

export const addGoalMember = createServerFn({ method: 'POST' })
  .inputValidator(AddGoalMemberInputSchema)
  .handler(async ({ data }): Promise<AddGoalMemberResponse> => {
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
          error: 'Solo un admin puede agregar participantes',
        };
      }

      const trimmedName = data.name.trim();
      if (!trimmedName) {
        return {
          success: false,
          error: 'El nombre del participante es obligatorio',
        };
      }

      const existingMember = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          name: {
            equals: trimmedName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
        },
      });

      if (existingMember) {
        return {
          success: false,
          error: 'Ya existe un participante con ese nombre',
        };
      }

      let userIdToAttach: string | null = null;
      let memberName = trimmedName;

      if (data.userId) {
        const user = await db.user.findUnique({
          where: {
            id: data.userId,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (!user) {
          return {
            success: false,
            error: 'Usuario no encontrado',
          };
        }

        const existingMembershipByUser = await db.groupMember.findFirst({
          where: {
            groupId: data.groupId,
            userId: user.id,
          },
          select: {
            id: true,
          },
        });

        if (existingMembershipByUser) {
          return {
            success: false,
            error: 'Este usuario ya es participante de la meta',
          };
        }

        userIdToAttach = user.id;
        memberName = user.name;
      }

      const newMember = await db.groupMember.create({
        data: {
          groupId: data.groupId,
          name: memberName,
          userId: userIdToAttach,
          role: 'member',
        },
        select: {
          id: true,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: actorMember.name,
          action: 'member.added',
          targetName: memberName,
          details: {
            memberId: newMember.id,
            userId: userIdToAttach,
          },
        },
      });

      return {
        success: true,
        memberId: newMember.id,
      };
    } catch (error) {
      console.error('Error adding goal member:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo agregar el participante',
      };
    }
  });
