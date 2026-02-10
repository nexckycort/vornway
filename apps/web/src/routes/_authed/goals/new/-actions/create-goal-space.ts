/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

interface CreateGoalSpaceInput {
  name: string;
  currency: string;
  targetAmount: number;
  startDate: string;
  endDate: string;
  installmentCount: number;
  participants: Array<{
    name: string;
    userId?: string | null;
  }>;
}

interface CreateGoalSpaceResponse {
  success: boolean;
  goalGroupId?: string;
  error?: string;
}

export const createGoalSpace = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateGoalSpaceInput) => data)
  .handler(async ({ data }): Promise<CreateGoalSpaceResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      if (!data.name.trim()) {
        return {
          success: false,
          error: 'El nombre de la meta es obligatorio',
        };
      }

      if (data.targetAmount <= 0 || data.installmentCount <= 0) {
        return {
          success: false,
          error: 'Monto objetivo y cuotas deben ser mayores a 0',
        };
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return {
          success: false,
          error: 'Fechas inválidas',
        };
      }

      if (endDate < startDate) {
        return {
          success: false,
          error: 'La fecha fin debe ser mayor o igual a la fecha inicio',
        };
      }

      const now = new Date();
      const groupId = crypto.randomUUID();
      const inviteCode = crypto.randomUUID().slice(0, 8);
      const installmentAmount = data.targetAmount / data.installmentCount;

      const created = await db.$transaction(async (tx) => {
        const group = await tx.group.create({
          data: {
            id: groupId,
            name: data.name.trim(),
            type: 'meta',
            createdAt: now,
            updatedAt: now,
            ownerId: userId,
            inviteCode,
          },
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                name: true,
              },
            },
          },
        });

        const ownerMember = await tx.groupMember.create({
          data: {
            userId,
            groupId: group.id,
            name: group.owner?.name ?? session.data.name ?? 'Usuario',
            role: 'admin',
            joinedAt: now,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (data.participants.length > 0) {
          await tx.groupMember.createMany({
            data: data.participants.map((participant) => ({
              groupId: group.id,
              userId: participant.userId ?? null,
              name: participant.name,
              role: 'member',
              joinedAt: now,
            })),
          });
        }

        await tx.goal.create({
          data: {
            groupId: group.id,
            createdByMemberId: ownerMember.id,
            title: data.name.trim(),
            description: null,
            currency: data.currency,
            targetAmount: data.targetAmount,
            startDate,
            endDate,
            installmentCount: data.installmentCount,
            installmentAmount,
          },
        });

        await tx.activityLog.create({
          data: {
            groupId: group.id,
            actorUserId: userId,
            actorName: ownerMember.name,
            action: 'goal.created',
            targetName: data.name.trim(),
            details: {
              targetAmount: data.targetAmount,
              currency: data.currency,
              installmentCount: data.installmentCount,
              installmentAmount,
              participantCount: data.participants.length + 1,
              startDate,
              endDate,
            },
          },
        });

        return group.id;
      });

      return {
        success: true,
        goalGroupId: created,
      };
    } catch (error) {
      console.error('Error creating goal space:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'No se pudo crear la meta',
      };
    }
  });
