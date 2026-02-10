import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';
import { auth } from '~/infrastructure/auth/better-auth.config';
import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const JoinGroupInputSchema = z.object({
  groupId: z.string(),
  existingMemberId: z.string().optional(), // Si se asocia a un miembro existente
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es requerido')
    .max(80, 'Nombre demasiado largo')
    .optional(),
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
      let userId = session.data.userId;
      let userName = session.data.name;
      const preferredName = data.name?.trim();

      if (!userId) {
        const result = await auth.api.signInAnonymous({ body: {} });
        if (!result) {
          return {
            success: false,
            error: 'No se pudo crear una sesión anónima',
          };
        }

        const user = result.user;
        if (preferredName) {
          await db.user.update({
            where: { id: user.id },
            data: { name: preferredName },
          });
        }

        await session.update({
          userId: user.id,
          email: user.email,
          name: preferredName ?? user.name ?? 'Invitado',
          isAnonymous: true,
        });

        userId = user.id;
        userName = preferredName ?? user.name ?? 'Invitado';
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

      const existingName = user.name ?? userName ?? undefined;
      const isAnonymousName = existingName
        ? existingName.toLowerCase() === 'anonymous'
        : false;

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

      // Si se seleccionó un miembro existente, usar su nombre como fallback
      let selectedMemberName: string | undefined;
      if (data.existingMemberId) {
        const existingMember = await db.groupMember.findUnique({
          where: { id: data.existingMemberId },
          select: { id: true, userId: true, groupId: true, name: true },
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

        selectedMemberName = existingMember.name ?? undefined;
      }

      // Determinar nombre final (preferido > nombre del miembro seleccionado > existente usuario)
      const finalNameCandidate = (
        preferredName ??
        selectedMemberName ??
        existingName ??
        ''
      ).trim();
      const isMissingName =
        !finalNameCandidate || finalNameCandidate.toLowerCase() === 'anonymous';

      if (isMissingName) {
        return {
          success: false,
          error: 'El nombre es requerido',
        };
      }

      const finalName = finalNameCandidate;

      // Actualizar nombre si viene uno nuevo, si el existente es Anonymous, o si usamos el nombre del miembro seleccionado
      if (
        preferredName ||
        isAnonymousName ||
        (selectedMemberName && finalName !== existingName)
      ) {
        await db.user.update({
          where: { id: userId },
          data: { name: finalName },
        });
        await session.update({
          userId,
          email: session.data.email,
          name: finalName,
        });
        userName = finalName;
      } else {
        userName = finalName;
      }

      if (data.existingMemberId) {
        await db.groupMember.update({
          where: { id: data.existingMemberId },
          data: { userId },
        });
      } else {
        await db.groupMember.create({
          data: {
            groupId: data.groupId,
            userId,
            name: finalName,
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
