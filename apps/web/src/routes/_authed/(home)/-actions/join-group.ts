import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const JoinGroupInputSchema = z.object({
  groupId: z.string(),
  existingMemberId: z.string().optional(), // Si se asocia a un miembro existente
});

interface JoinGroupResponse {
  success: boolean;
  groupId?: string;
  error?: string;
}

export const joinGroup = createServerFn({ method: 'POST' })
  .inputValidator(JoinGroupInputSchema)
  .handler(async ({ data }): Promise<JoinGroupResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      // Obtener el nombre del usuario
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado',
        };
      }

      // Verificar que el grupo existe
      const group = await db.group.findUnique({
        where: { id: data.groupId },
        select: { id: true },
      });

      if (!group) {
        return {
          success: false,
          error: 'Grupo no encontrado',
        };
      }

      // Verificar si ya es miembro
      const existingMembership = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId: userId,
        },
      });

      if (existingMembership) {
        return {
          success: true,
          groupId: data.groupId,
        };
      }

      if (data.existingMemberId) {
        // Asociar al miembro existente
        const existingMember = await db.groupMember.findUnique({
          where: { id: data.existingMemberId },
          select: { id: true, userId: true, groupId: true },
        });

        if (!existingMember) {
          return {
            success: false,
            error: 'Miembro no encontrado',
          };
        }

        if (existingMember.userId !== null) {
          return {
            success: false,
            error: 'Este participante ya tiene una cuenta asociada',
          };
        }

        if (existingMember.groupId !== data.groupId) {
          return {
            success: false,
            error: 'El miembro no pertenece a este grupo',
          };
        }

        // Actualizar el miembro existente con el userId
        await db.groupMember.update({
          where: { id: data.existingMemberId },
          data: { userId },
        });
      } else {
        // Crear nuevo miembro
        await db.groupMember.create({
          data: {
            groupId: data.groupId,
            userId,
            name: user.name,
            role: 'member',
          },
        });
      }

      return {
        success: true,
        groupId: data.groupId,
      };
    } catch (error) {
      console.error('Error joining group:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error al unirse al grupo',
      };
    }
  });
