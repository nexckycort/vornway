import { createServerFn } from '@tanstack/react-start';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

interface CreateGroupInput {
  name: string;
  currency: string;
  category: string;
  participants: string[];
}

interface CreateGroupResponse {
  success: boolean;
  groupId?: string;
  inviteCode?: string;
  error?: string;
}

export const createGroup = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateGroupInput) => data)
  .handler(async ({ data }): Promise<CreateGroupResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      const groupId = crypto.randomUUID();
      const inviteCode = crypto.randomUUID().slice(0, 8);
      const now = new Date();

      const { owner } = await db.group.create({
        data: {
          id: groupId,
          name: data.name,
          type: data.category,
          createdAt: now,
          updatedAt: now,
          ownerId: userId,
          inviteCode,
        },
        select: {
          owner: {
            select: {
              name: true,
            },
          },
        },
      });

      await db.groupMember.create({
        data: {
          userId: userId,
          groupId: groupId,
          name: owner?.name ?? 'Usuario',
          role: 'admin',
          joinedAt: now,
        },
      });

      if (data.participants.length > 0) {
        await db.groupMember.createMany({
          data: data.participants.map((participantName) => ({
            groupId: groupId,
            name: participantName,
            role: 'member',
            joinedAt: now,
          })),
        });
      }

      return {
        success: true,
        groupId,
        inviteCode,
      };
    } catch (error) {
      console.error('Error creating group:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error al crear el grupo',
      };
    }
  });
