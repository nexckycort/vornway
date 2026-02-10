import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const FindGroupByInviteInputSchema = z.object({
  inviteCode: z.string().min(1),
});

interface UnregisteredMember {
  id: string;
  name: string;
}

interface FindGroupByInviteResponse {
  success: boolean;
  group?: {
    id: string;
    name: string;
    type: string;
    memberCount: number;
  };
  unregisteredMembers: UnregisteredMember[];
  alreadyMember: boolean;
  error?: string;
}

export const findGroupByInvite = createServerFn({ method: 'POST' })
  .inputValidator(FindGroupByInviteInputSchema)
  .handler(async ({ data }): Promise<FindGroupByInviteResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId ?? null;

      // Extraer el código de invitación del enlace si es una URL
      let inviteCode = data.inviteCode.trim();

      // Si es una URL, extraer el código
      if (inviteCode.includes('/')) {
        const parts = inviteCode.split('/');
        inviteCode = parts[parts.length - 1];
      }

      // Limpiar caracteres especiales
      inviteCode = inviteCode.replace(/[?#].*/g, '');

      const group = await db.group.findUnique({
        where: { inviteCode },
        select: {
          id: true,
          name: true,
          type: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      if (!group) {
        return {
          success: false,
          unregisteredMembers: [],
          alreadyMember: false,
          error: 'Código de invitación inválido',
        };
      }

      // Verificar si el usuario ya es miembro
      const existingMembership = userId
        ? group.GroupMember.find((m) => m.userId === userId)
        : null;

      // Obtener miembros sin userId (no registrados)
      const unregisteredMembers: UnregisteredMember[] =
        group.GroupMember.filter((m) => m.userId === null).map((m) => ({
          id: m.id,
          name: m.name,
        }));

      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          type: group.type,
          memberCount: group.GroupMember.length,
        },
        unregisteredMembers,
        alreadyMember: Boolean(existingMembership),
      };
    } catch (error) {
      console.error('Error finding group:', error);
      return {
        success: false,
        unregisteredMembers: [],
        alreadyMember: false,
        error:
          error instanceof Error ? error.message : 'Error al buscar el grupo',
      };
    }
  });
