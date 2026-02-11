/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const GetGoalsInputSchema = z.object({
  groupId: z.string(),
});

interface GoalContributionItem {
  id: string;
  amount: number;
  contributedAt: Date;
  notes: string | null;
  member: {
    id: string;
    name: string;
  };
}

interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  createdByMemberId: string;
  canDelete: boolean;
  currency: string;
  targetAmount: number;
  startDate: Date;
  endDate: Date;
  installmentCount: number;
  installmentAmount: number;
  totalContributed: number;
  progressPct: number;
  expectedByNow: number;
  remaining: number;
  contributions: GoalContributionItem[];
}

interface GetGoalsResponse {
  groupName: string;
  inviteCode: string | null;
  isCurrentUserAdmin: boolean;
  members: Array<{
    id: string;
    name: string;
    role: string;
    isCurrentUser: boolean;
    isRegisteredUser: boolean;
  }>;
  goals: GoalItem[];
}

function getElapsedMonthlyInstallments(
  startDate: Date,
  endDate: Date,
  installmentCount: number,
): number {
  const now = new Date();
  if (now < startDate) return 0;
  if (now > endDate) return installmentCount;

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();

  const monthsElapsed =
    (nowYear - startYear) * 12 + (nowMonth - startMonth) + 1;
  return Math.max(0, Math.min(installmentCount, monthsElapsed));
}

export const getGoals = createServerFn({ method: 'POST' })
  .inputValidator(GetGoalsInputSchema)
  .handler(async ({ data }): Promise<GetGoalsResponse> => {
    const session = await useAppSession();
    const userId = session.data.userId;

    if (!userId) {
      throw new Error('No autenticado');
    }

    const group = await db.group.findUnique({
      where: { id: data.groupId },
      select: {
        name: true,
        inviteCode: true,
        GroupMember: {
          select: {
            id: true,
            name: true,
            role: true,
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        Goal: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            title: true,
            description: true,
            createdByMemberId: true,
            currency: true,
            targetAmount: true,
            startDate: true,
            endDate: true,
            installmentCount: true,
            installmentAmount: true,
            contributions: {
              select: {
                id: true,
                amount: true,
                contributedAt: true,
                notes: true,
                member: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                contributedAt: 'desc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!group) {
      throw new Error('Grupo no encontrado');
    }

    const currentMembership = group.GroupMember.find(
      (member) => member.userId === userId,
    );

    if (!currentMembership) {
      throw new Error('No tienes acceso a este grupo');
    }

    return {
      groupName: group.name,
      inviteCode: group.inviteCode,
      isCurrentUserAdmin: currentMembership.role === 'admin',
      members: group.GroupMember.map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        isCurrentUser: member.userId === userId,
        isRegisteredUser: member.userId !== null,
      })),
      goals: group.Goal.map((goal) => {
        const totalContributed = goal.contributions.reduce(
          (sum, contribution) => sum + contribution.amount,
          0,
        );

        const progressPct =
          goal.targetAmount > 0
            ? Math.min(100, (totalContributed / goal.targetAmount) * 100)
            : 0;

        const elapsedInstallments = getElapsedMonthlyInstallments(
          goal.startDate,
          goal.endDate,
          goal.installmentCount,
        );
        const expectedByNow = Math.min(
          goal.targetAmount,
          elapsedInstallments * goal.installmentAmount,
        );

        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          createdByMemberId: goal.createdByMemberId,
          canDelete: goal.createdByMemberId === currentMembership.id,
          currency: goal.currency,
          targetAmount: goal.targetAmount,
          startDate: goal.startDate,
          endDate: goal.endDate,
          installmentCount: goal.installmentCount,
          installmentAmount: goal.installmentAmount,
          totalContributed,
          progressPct,
          expectedByNow,
          remaining: Math.max(0, goal.targetAmount - totalContributed),
          contributions: goal.contributions.map((contribution) => ({
            id: contribution.id,
            amount: contribution.amount,
            contributedAt: contribution.contributedAt,
            notes: contribution.notes ?? null,
            member: {
              id: contribution.member.id,
              name: contribution.member.name,
            },
          })),
        };
      }),
    };
  });
