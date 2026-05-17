import { db } from '~/infrastructure/database/connection';

import type {
  CreateGoalInput,
  CreateGoalResult,
  GoalListItem,
  GoalsListResponse,
} from './types';

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

function summarizeGoal(goal: {
  id: string;
  title: string;
  description: string | null;
  currency: string;
  targetAmount: number;
  endDate: Date;
  createdAt: Date;
  group: {
    id: string;
    name: string;
  };
  contributions: Array<{ amount: number }>;
}): GoalListItem {
  const savedAmount = normalizeAmount(
    goal.contributions.reduce((total, contribution) => total + contribution.amount, 0),
  );
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, normalizeAmount((savedAmount / goal.targetAmount) * 100))
      : 0;

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    savedAmount,
    progress,
    endDate: goal.endDate,
    createdAt: goal.createdAt,
    group: goal.group,
  };
}

export type GoalsListQuery = {
  limit: number;
  cursor?: string;
};

export type GoalsService = {
  list: (userId: string, query: GoalsListQuery) => Promise<GoalsListResponse>;
  create: (input: CreateGoalInput) => Promise<CreateGoalResult>;
};

export function createGoalsService(): GoalsService {
  return {
    list: async (userId, query) => {
      const where = {
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
            currency: true,
            targetAmount: true,
            endDate: true,
            createdAt: true,
            group: {
              select: {
                id: true,
                name: true,
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
          nextCursor: hasNextPage ? data[data.length - 1]?.id ?? null : null,
        },
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
        (!Number.isFinite(input.installmentAmount) || input.installmentAmount <= 0)
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

        if (input.participants && input.participants.length > 0) {
          await tx.groupMember.createMany({
            data: input.participants.map((participant) => ({
              groupId: group.id,
              userId: participant.userId ?? null,
              name: participant.name.trim(),
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
            currency: input.currency,
            targetAmount: input.targetAmount,
            startDate: input.startDate,
            endDate: input.endDate,
            installmentCount: input.installmentCount,
            installmentAmount,
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
              participantCount: (input.participants?.length ?? 0) + 1,
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
