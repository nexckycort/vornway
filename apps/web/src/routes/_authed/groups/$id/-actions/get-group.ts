import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const GetGroupInputSchema = z.object({
  groupId: z.string(),
});

interface GetGroupResponse {
  name: string;
  participantCount: number;
}

export const getGroup = createServerFn({ method: 'POST' })
  .inputValidator(GetGroupInputSchema)
  .handler(async ({ data }): Promise<GetGroupResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        throw new Error('No autenticado');
      }

      const groupRecord = await db.group.findUnique({
        select: {
          name: true,
          GroupMember: {
            select: {
              _count: true,
            },
          },
        },
        where: { id: data.groupId },
      });

      if (!groupRecord) {
        throw new Error('Grupo no encontrado');
      }

      return {
        name: groupRecord.name,
        participantCount: groupRecord.GroupMember.length,
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  });
