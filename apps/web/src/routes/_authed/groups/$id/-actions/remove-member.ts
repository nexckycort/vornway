import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const RemoveMemberInputSchema = z.object({
  groupId: z.string(),
  memberId: z.string(),
});

interface RemoveMemberResponse {
  success: boolean;
  error?: string;
}

export const removeMember = createServerFn({ method: 'POST' })
  .inputValidator(RemoveMemberInputSchema)
  .handler(async ({ data }): Promise<RemoveMemberResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      // Verificar que el grupo existe y que el usuario es el owner
      const group = await db.group.findUnique({
        where: { id: data.groupId },
        select: { ownerId: true },
      });

      if (!group) {
        return {
          success: false,
          error: 'Grupo no encontrado',
        };
      }

      if (group.ownerId !== userId) {
        return {
          success: false,
          error: 'Solo el creador del grupo puede eliminar participantes',
        };
      }

      // Verificar que el miembro existe y pertenece al grupo
      const member = await db.groupMember.findUnique({
        where: { id: data.memberId },
        select: { groupId: true, userId: true },
      });

      if (!member || member.groupId !== data.groupId) {
        return {
          success: false,
          error: 'Participante no encontrado',
        };
      }

      // No permitir que el owner se elimine a sí mismo
      if (member.userId === userId) {
        return {
          success: false,
          error: 'No puedes eliminarte a ti mismo del grupo',
        };
      }

      // Eliminar el miembro
      await db.groupMember.delete({
        where: { id: data.memberId },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error removing member:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al eliminar el participante',
      };
    }
  });
