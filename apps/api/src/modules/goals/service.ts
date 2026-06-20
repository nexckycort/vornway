import { db } from '~/infrastructure/database/connection';
import { resolveUserImageUrl } from '~/routes/authed/users/user-image.service';
import type {
  CreateGoalContributionInput,
  CreateGoalContributionResult,
  CreateGoalInput,
  CreateGoalResult,
  DeleteGoalContributionInput,
  DeleteGoalContributionResult,
  GoalDetailResult,
  GoalListItem,
  GoalsListResponse,
  UpdateGoalInput,
  UpdateGoalResult,
} from './types';

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

function differenceInCalendarDays(from: Date, to: Date): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);

  return Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000);
}

function monthKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function estimateProjectedCompletionDate(input: {
  savedAmount: number;
  targetAmount: number;
  contributions: Array<{ amount: number; contributedAt: Date }>;
}): Date | null {
  const { savedAmount, targetAmount, contributions } = input;
  const remaining = targetAmount - savedAmount;
  if (remaining <= 0) return new Date();
  if (contributions.length === 0) return null;

  const sorted = [...contributions].sort(
    (left, right) =>
      left.contributedAt.getTime() - right.contributedAt.getTime(),
  );
  const first = sorted[0]?.contributedAt;
  const last = sorted[sorted.length - 1]?.contributedAt ?? new Date();
  if (!first) return null;

  const days = Math.max(1, differenceInCalendarDays(first, last) + 1);
  const ratePerDay =
    sorted.reduce((total, contribution) => total + contribution.amount, 0) /
    days;
  if (ratePerDay <= 0) return null;

  const projected = new Date();
  projected.setDate(projected.getDate() + Math.ceil(remaining / ratePerDay));
  return projected;
}

function summarizeGoal(goal: {
  id: string;
  title: string;
  description: string | null;
  goalType: string;
  emoji: string | null;
  coverImageUrl: string | null;
  themeColor: string | null;
  contributionMode: string;
  currency: string;
  targetAmount: number;
  installmentCount: number;
  installmentAmount: number;
  endDate: Date;
  createdAt: Date;
  group: {
    id: string;
    name: string;
    _count?: {
      GroupMember: number;
    };
  };
  contributions: Array<{ amount: number }>;
}): GoalListItem {
  const savedAmount = normalizeAmount(
    goal.contributions.reduce(
      (total, contribution) => total + contribution.amount,
      0,
    ),
  );
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, normalizeAmount((savedAmount / goal.targetAmount) * 100))
      : 0;
  const participantCount = goal.group._count?.GroupMember ?? 0;
  const monthlyTarget = normalizeAmount(
    goal.installmentAmount ||
      goal.targetAmount / Math.max(1, goal.installmentCount),
  );

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    goalType: goal.goalType,
    emoji: goal.emoji,
    coverImageUrl: goal.coverImageUrl,
    themeColor: goal.themeColor,
    contributionMode: goal.contributionMode,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    savedAmount,
    progress,
    endDate: goal.endDate,
    createdAt: goal.createdAt,
    participantCount,
    daysLeft: Math.max(0, differenceInCalendarDays(new Date(), goal.endDate)),
    monthlyTarget,
    perMemberMonthlyTarget: normalizeAmount(
      monthlyTarget / Math.max(1, participantCount),
    ),
    group: {
      id: goal.group.id,
      name: goal.group.name,
    },
  };
}

function summarizeGoalDetail(
  goal: {
    id: string;
    title: string;
    description: string | null;
    goalType: string;
    emoji: string | null;
    coverImageUrl: string | null;
    themeColor: string | null;
    contributionMode: string;
    currency: string;
    targetAmount: number;
    startDate: Date;
    endDate: Date;
    installmentCount: number;
    installmentAmount: number;
    suggestedContributionAmount: number | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    group: {
      id: string;
      name: string;
      type: string;
      description: string | null;
      inviteCode: string;
      createdAt: Date;
      updatedAt: Date;
      GroupMember: Array<{
        id: string;
        name: string;
        role: string;
        userId: string | null;
        user: {
          email: string;
          image: string | null;
          updatedAt: Date;
        } | null;
      }>;
    };
    contributions: Array<{
      id: string;
      amount: number;
      contributedAt: Date;
      notes: string | null;
      member: {
        id: string;
        name: string;
        userId: string | null;
        user: {
          image: string | null;
          updatedAt: Date;
        } | null;
      };
    }>;
  },
  userId: string,
): GoalDetailResult {
  const savedAmount = normalizeAmount(
    goal.contributions.reduce(
      (total, contribution) => total + contribution.amount,
      0,
    ),
  );
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, normalizeAmount((savedAmount / goal.targetAmount) * 100))
      : 0;
  const currentMembership = goal.group.GroupMember.find(
    (member) => member.userId === userId,
  );
  const now = new Date();
  const currentMonthKey = monthKey(now);
  const currentMonthContributions = goal.contributions.filter(
    (contribution) => monthKey(contribution.contributedAt) === currentMonthKey,
  );
  const memberStats = goal.group.GroupMember.map((member) => {
    const memberContributions = goal.contributions.filter(
      (contribution) => contribution.member.id === member.id,
    );
    const totalAmount = normalizeAmount(
      memberContributions.reduce(
        (total, contribution) => total + contribution.amount,
        0,
      ),
    );
    const latestContributionAt =
      [...memberContributions].sort(
        (left, right) =>
          right.contributedAt.getTime() - left.contributedAt.getTime(),
      )[0]?.contributedAt ?? null;

    return {
      memberId: member.id,
      totalAmount,
      contributionCount: memberContributions.length,
      contributedThisMonth: memberContributions.some(
        (contribution) =>
          monthKey(contribution.contributedAt) === currentMonthKey,
      ),
      latestContributionAt,
    };
  });
  const monthlyTarget = normalizeAmount(
    goal.installmentAmount ||
      goal.targetAmount / Math.max(1, goal.installmentCount),
  );
  const perMemberMonthlyTarget = normalizeAmount(
    monthlyTarget / Math.max(1, goal.group.GroupMember.length),
  );

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    goalType: goal.goalType,
    emoji: goal.emoji,
    coverImageUrl: goal.coverImageUrl,
    themeColor: goal.themeColor,
    contributionMode: goal.contributionMode,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    savedAmount,
    progress,
    endDate: goal.endDate,
    createdAt: goal.createdAt,
    participantCount: goal.group.GroupMember.length,
    daysLeft: Math.max(0, differenceInCalendarDays(now, goal.endDate)),
    monthlyTarget,
    perMemberMonthlyTarget,
    startDate: goal.startDate,
    installmentCount: goal.installmentCount,
    installmentAmount: goal.installmentAmount,
    suggestedContributionAmount: goal.suggestedContributionAmount,
    completedAt: goal.completedAt,
    updatedAt: goal.updatedAt,
    group: {
      id: goal.group.id,
      name: goal.group.name,
      type: goal.group.type,
      description: goal.group.description,
      inviteCode: goal.group.inviteCode,
      createdAt: goal.group.createdAt,
      updatedAt: goal.group.updatedAt,
    },
    members: goal.group.GroupMember.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.user?.email ?? null,
      image: resolveUserImageUrl(
        member.user?.image ?? null,
        member.user?.updatedAt ?? null,
      ),
      role: member.role,
      userId: member.userId,
      isCurrentUser: member.userId === userId,
    })),
    myMembership: currentMembership
      ? {
          id: currentMembership.id,
          name: currentMembership.name,
          role: currentMembership.role,
        }
      : null,
    contributions: goal.contributions.map((contribution) => ({
      id: contribution.id,
      amount: contribution.amount,
      contributedAt: contribution.contributedAt,
      notes: contribution.notes,
      member: {
        id: contribution.member.id,
        name: contribution.member.name,
        image: resolveUserImageUrl(
          contribution.member.user?.image ?? null,
          contribution.member.user?.updatedAt ?? null,
        ),
        isCurrentUser: contribution.member.userId === userId,
      },
    })),
    stats: {
      remainingAmount: normalizeAmount(
        Math.max(0, goal.targetAmount - savedAmount),
      ),
      averageContribution:
        goal.contributions.length > 0
          ? normalizeAmount(savedAmount / goal.contributions.length)
          : 0,
      projectedCompletionDate: estimateProjectedCompletionDate({
        savedAmount,
        targetAmount: goal.targetAmount,
        contributions: goal.contributions,
      }),
      currentMonthContributionTotal: normalizeAmount(
        currentMonthContributions.reduce(
          (total, contribution) => total + contribution.amount,
          0,
        ),
      ),
      contributorsThisMonth: new Set(
        currentMonthContributions.map((contribution) => contribution.member.id),
      ).size,
      pendingMembersThisMonth: memberStats.filter(
        (member) => !member.contributedThisMonth,
      ).length,
    },
    memberStats,
  };
}

export type GoalsListQuery = {
  limit: number;
  cursor?: string;
  search?: string;
};

export type GoalsService = {
  list: (userId: string, query: GoalsListQuery) => Promise<GoalsListResponse>;
  getById: (userId: string, goalId: string) => Promise<GoalDetailResult | null>;
  create: (input: CreateGoalInput) => Promise<CreateGoalResult>;
  update: (input: UpdateGoalInput) => Promise<UpdateGoalResult>;
  addContribution: (
    input: CreateGoalContributionInput,
  ) => Promise<CreateGoalContributionResult>;
  deleteContribution: (
    input: DeleteGoalContributionInput,
  ) => Promise<DeleteGoalContributionResult>;
};

export function createGoalsService(): GoalsService {
  return {
    list: async (userId, query) => {
      const where = {
        deletedAt: null,
        ...(query.search
          ? {
              title: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
        group: {
          type: 'meta' as const,
          OR: [
            {
              ownerId: userId,
            },
            {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
      };

      const [total, rows] = await Promise.all([
        db.goal.count({ where }),
        db.goal.findMany({
          where,
          ...(query.cursor
            ? {
                cursor: {
                  id: query.cursor,
                },
                skip: 1,
              }
            : {}),
          take: query.limit + 1,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            title: true,
            description: true,
            goalType: true,
            emoji: true,
            coverImageUrl: true,
            themeColor: true,
            contributionMode: true,
            currency: true,
            targetAmount: true,
            installmentCount: true,
            installmentAmount: true,
            endDate: true,
            createdAt: true,
            group: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    GroupMember: true,
                  },
                },
              },
            },
            contributions: {
              select: {
                amount: true,
              },
            },
          },
        }),
      ]);

      const hasNextPage = rows.length > query.limit;
      const data = rows.slice(0, query.limit).map(summarizeGoal);

      return {
        data,
        pagination: {
          limit: query.limit,
          total,
          nextCursor: hasNextPage ? (data[data.length - 1]?.id ?? null) : null,
        },
      };
    },
    getById: async (userId, goalId) => {
      const goal = await db.goal.findFirst({
        where: {
          id: goalId,
          deletedAt: null,
          group: {
            type: 'meta' as const,
            OR: [
              {
                ownerId: userId,
              },
              {
                GroupMember: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          goalType: true,
          emoji: true,
          coverImageUrl: true,
          themeColor: true,
          contributionMode: true,
          currency: true,
          targetAmount: true,
          startDate: true,
          endDate: true,
          installmentCount: true,
          installmentAmount: true,
          suggestedContributionAmount: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          group: {
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
              inviteCode: true,
              createdAt: true,
              updatedAt: true,
              GroupMember: {
                orderBy: [
                  {
                    joinedAt: 'asc',
                  },
                  {
                    id: 'asc',
                  },
                ],
                select: {
                  id: true,
                  name: true,
                  role: true,
                  userId: true,
                  user: {
                    select: {
                      email: true,
                      image: true,
                      updatedAt: true,
                    },
                  },
                },
              },
            },
          },
          contributions: {
            orderBy: [
              {
                contributedAt: 'desc',
              },
              {
                id: 'desc',
              },
            ],
            select: {
              id: true,
              amount: true,
              contributedAt: true,
              notes: true,
              member: {
                select: {
                  id: true,
                  name: true,
                  userId: true,
                  user: {
                    select: {
                      image: true,
                      updatedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!goal) {
        return null;
      }

      return summarizeGoalDetail(goal, userId);
    },
    update: async (input) => {
      const goal = await db.goal.findFirst({
        where: {
          id: input.goalId,
          deletedAt: null,
          group: {
            type: 'meta' as const,
            OR: [
              { ownerId: input.userId },
              {
                GroupMember: {
                  some: {
                    userId: input.userId,
                    role: 'admin',
                  },
                },
              },
            ],
          },
        },
        select: {
          id: true,
          title: true,
          groupId: true,
          group: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!goal) {
        throw new Error('Meta no encontrada');
      }

      const data: {
        title?: string;
        description?: string | null;
        goalType?: string;
        emoji?: string | null;
        coverImageUrl?: string | null;
        themeColor?: string | null;
        contributionMode?: string;
        currency?: string;
        targetAmount?: number;
        startDate?: Date;
        endDate?: Date;
        installmentCount?: number;
        installmentAmount?: number;
        suggestedContributionAmount?: number | null;
      } = {};

      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) throw new Error('El nombre de la meta es obligatorio');
        data.title = name;
      }

      if (input.description !== undefined) {
        data.description = input.description?.trim() || null;
      }

      if (input.goalType !== undefined) data.goalType = input.goalType;
      if (input.emoji !== undefined) data.emoji = input.emoji?.trim() || null;
      if (input.coverImageUrl !== undefined) {
        data.coverImageUrl = input.coverImageUrl?.trim() || null;
      }
      if (input.themeColor !== undefined) data.themeColor = input.themeColor;
      if (input.contributionMode !== undefined) {
        data.contributionMode = input.contributionMode;
      }
      if (input.currency !== undefined) {
        data.currency = input.currency.trim().toUpperCase();
      }
      if (input.targetAmount !== undefined) {
        if (input.targetAmount <= 0) {
          throw new Error('El monto objetivo debe ser mayor a 0');
        }
        data.targetAmount = input.targetAmount;
      }
      if (input.startDate !== undefined) data.startDate = input.startDate;
      if (input.endDate !== undefined) data.endDate = input.endDate;
      if (input.installmentCount !== undefined) {
        if (input.installmentCount <= 0) {
          throw new Error('Las cuotas deben ser mayores a 0');
        }
        data.installmentCount = input.installmentCount;
      }
      if (input.installmentAmount !== undefined) {
        if (input.installmentAmount !== null && input.installmentAmount <= 0) {
          throw new Error('La cuota mensual debe ser mayor a 0');
        }
        if (input.installmentAmount !== null) {
          data.installmentAmount = input.installmentAmount;
        }
      }
      if (input.suggestedContributionAmount !== undefined) {
        data.suggestedContributionAmount = input.suggestedContributionAmount;
      }

      const updated = await db.goal.update({
        where: { id: goal.id },
        data,
        select: { id: true },
      });

      if (data.title !== undefined) {
        await db.group.update({
          where: { id: goal.groupId },
          data: { name: data.title, updatedAt: new Date() },
        });
      }

      return { id: updated.id };
    },
    addContribution: async ({
      userId,
      goalId,
      memberId,
      amount,
      contributedAt,
      notes,
    }) => {
      if (amount <= 0) {
        throw new Error('El aporte debe ser mayor a 0');
      }

      const goal = await db.goal.findFirst({
        where: {
          id: goalId,
          deletedAt: null,
          group: {
            type: 'meta' as const,
            OR: [
              {
                ownerId: userId,
              },
              {
                GroupMember: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          },
        },
        select: {
          id: true,
          title: true,
          currency: true,
          targetAmount: true,
          groupId: true,
        },
      });

      if (!goal) {
        throw new Error('Meta no encontrada');
      }

      const actorMember = await db.groupMember.findFirst({
        where: {
          groupId: goal.groupId,
          userId,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!actorMember) {
        throw new Error('No tienes acceso a esta meta');
      }

      if (actorMember.role !== 'admin') {
        throw new Error('Solo un admin puede registrar aportes');
      }

      const contributionMember = await db.groupMember.findFirst({
        where: {
          id: memberId,
          groupId: goal.groupId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!contributionMember) {
        throw new Error('Participante inválido');
      }

      const contribution = await db.goalContribution.create({
        data: {
          goalId: goal.id,
          memberId: contributionMember.id,
          amount,
          contributedAt: contributedAt ?? new Date(),
          notes: notes?.trim() || null,
        },
        select: {
          id: true,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: goal.groupId,
          actorUserId: userId,
          actorName: actorMember.name,
          action: 'goal.contribution.created',
          targetName: goal.title,
          details: {
            goalId: goal.id,
            contributionId: contribution.id,
            amount,
            currency: goal.currency,
            memberId: contributionMember.id,
            memberName: contributionMember.name,
          },
        },
      });

      const contributionTotals = await db.goalContribution.aggregate({
        where: { goalId: goal.id },
        _sum: { amount: true },
      });
      const totalSaved = contributionTotals._sum.amount ?? 0;
      if (totalSaved >= goal.targetAmount) {
        await db.goal.update({
          where: { id: goal.id },
          data: { completedAt: new Date() },
        });
      }

      return {
        id: contribution.id,
      };
    },
    deleteContribution: async ({ userId, goalId, contributionId }) => {
      const goal = await db.goal.findFirst({
        where: {
          id: goalId,
          deletedAt: null,
          group: {
            type: 'meta' as const,
            OR: [
              {
                ownerId: userId,
              },
              {
                GroupMember: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          },
        },
        select: {
          id: true,
          title: true,
          currency: true,
          targetAmount: true,
          groupId: true,
        },
      });

      if (!goal) {
        throw new Error('Meta no encontrada');
      }

      const actorMember = await db.groupMember.findFirst({
        where: {
          groupId: goal.groupId,
          userId,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!actorMember) {
        throw new Error('No tienes acceso a esta meta');
      }

      if (actorMember.role !== 'admin') {
        throw new Error('Solo un admin puede eliminar aportes');
      }

      const contribution = await db.goalContribution.findFirst({
        where: {
          id: contributionId,
          goalId: goal.id,
        },
        select: {
          id: true,
          amount: true,
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!contribution) {
        throw new Error('Aporte no encontrado');
      }

      await db.goalContribution.delete({
        where: {
          id: contribution.id,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: goal.groupId,
          actorUserId: userId,
          actorName: actorMember.name,
          action: 'goal.contribution.deleted',
          targetName: goal.title,
          details: {
            goalId: goal.id,
            contributionId: contribution.id,
            amount: contribution.amount,
            currency: goal.currency,
            memberId: contribution.member.id,
            memberName: contribution.member.name,
          },
        },
      });

      const contributionTotals = await db.goalContribution.aggregate({
        where: { goalId: goal.id },
        _sum: { amount: true },
      });
      const totalSaved = contributionTotals._sum.amount ?? 0;
      if (totalSaved < goal.targetAmount) {
        await db.goal.update({
          where: { id: goal.id },
          data: { completedAt: null },
        });
      }

      return {
        id: contribution.id,
      };
    },
    create: async (input) => {
      if (!input.name.trim()) {
        throw new Error('El nombre de la meta es obligatorio');
      }

      if (input.targetAmount <= 0 || input.installmentCount <= 0) {
        throw new Error('Monto objetivo y cuotas deben ser mayores a 0');
      }

      if (
        input.installmentAmount !== undefined &&
        (!Number.isFinite(input.installmentAmount) ||
          input.installmentAmount <= 0)
      ) {
        throw new Error('La cuota mensual debe ser mayor a 0');
      }

      const groupId = crypto.randomUUID();
      const inviteCode = crypto.randomUUID().slice(0, 8);
      const now = new Date();
      const installmentAmount =
        input.installmentAmount && input.installmentAmount > 0
          ? input.installmentAmount
          : input.targetAmount / input.installmentCount;
      const normalizedParticipants = (input.participants ?? [])
        .map((participant) => ({
          name: participant.name.trim(),
          userId: participant.userId?.trim() || null,
        }))
        .filter((participant) => participant.name.length > 0)
        .filter((participant) => participant.userId !== input.userId)
        .filter(
          (participant, index, array) =>
            array.findIndex(
              (item) =>
                (item.userId && item.userId === participant.userId) ||
                (!item.userId &&
                  item.name.toLocaleLowerCase('es-CO') ===
                    participant.name.toLocaleLowerCase('es-CO')),
            ) === index,
        );

      return db.$transaction(async (tx) => {
        const group = await tx.group.create({
          data: {
            id: groupId,
            name: input.name.trim(),
            type: 'meta',
            createdAt: now,
            updatedAt: now,
            ownerId: input.userId,
            inviteCode,
          },
          select: {
            id: true,
            owner: {
              select: {
                name: true,
              },
            },
          },
        });

        const ownerMember = await tx.groupMember.create({
          data: {
            userId: input.userId,
            groupId: group.id,
            name: input.ownerName.trim() || group.owner?.name || 'Usuario',
            role: 'admin',
            joinedAt: now,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (normalizedParticipants.length > 0) {
          await tx.groupMember.createMany({
            data: normalizedParticipants.map((participant) => ({
              groupId: group.id,
              userId: participant.userId,
              name: participant.name,
              role: 'member',
              joinedAt: now,
            })),
          });
        }

        const goal = await tx.goal.create({
          data: {
            groupId: group.id,
            createdByMemberId: ownerMember.id,
            title: input.name.trim(),
            description: input.description?.trim() || null,
            goalType: input.goalType ?? 'saving',
            emoji: input.emoji?.trim() || null,
            coverImageUrl: input.coverImageUrl?.trim() || null,
            themeColor: input.themeColor?.trim() || null,
            contributionMode: input.contributionMode ?? 'manual',
            currency: input.currency,
            targetAmount: input.targetAmount,
            startDate: input.startDate,
            endDate: input.endDate,
            installmentCount: input.installmentCount,
            installmentAmount,
            suggestedContributionAmount:
              input.suggestedContributionAmount ?? null,
          },
          select: {
            id: true,
          },
        });

        await tx.activityLog.create({
          data: {
            groupId: group.id,
            actorUserId: input.userId,
            actorName: ownerMember.name,
            action: 'goal.created',
            targetName: input.name.trim(),
            details: {
              goalId: goal.id,
              targetAmount: input.targetAmount,
              currency: input.currency,
              installmentCount: input.installmentCount,
              installmentAmount,
              goalType: input.goalType ?? 'saving',
              contributionMode: input.contributionMode ?? 'manual',
              participantCount: normalizedParticipants.length + 1,
              startDate: input.startDate,
              endDate: input.endDate,
            },
          },
        });

        return {
          id: goal.id,
        };
      });
    },
  };
}
