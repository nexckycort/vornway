import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const GetGroupMembersInputSchema = z.object({
  groupId: z.string(),
});

interface GroupMember {
  id: string;
  name: string;
  email: string | null;
  isCurrentUser: boolean;
}

interface GetGroupMembersResponse {
  success: boolean;
  members: GroupMember[];
  currentUserMemberId: string | null;
  error?: string;
}

export const getGroupMembers = createServerFn({ method: 'POST' })
  .inputValidator(GetGroupMembersInputSchema)
  .handler(async ({ data }): Promise<GetGroupMembersResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          members: [],
          currentUserMemberId: null,
          error: 'No autenticado',
        };
      }

      const groupMembers = await db.groupMember.findMany({
        where: { groupId: data.groupId },
        select: {
          id: true,
          name: true,
          userId: true,
          user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });

      const currentUserMember = groupMembers.find((m) => m.userId === userId);

      const members: GroupMember[] = groupMembers.map((member) => ({
        id: member.id,
        name: member.userId === userId ? `${member.name} (Tú)` : member.name,
        email: member.user?.email ?? null,
        isCurrentUser: member.userId === userId,
      }));

      return {
        success: true,
        members,
        currentUserMemberId: currentUserMember?.id ?? null,
      };
    } catch (error) {
      console.error('Error fetching group members:', error);
      return {
        success: false,
        members: [],
        currentUserMemberId: null,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener los miembros',
      };
    }
  });
