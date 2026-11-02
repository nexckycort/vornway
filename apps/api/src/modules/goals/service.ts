import type {
  CreateGoalPayload,
  GoalsQuery,
  UpdateGoalPayload,
} from '@vornway/contracts/modules/goals/contract';
import {
  GoalNameRequired,
  GoalNotFound,
} from '@vornway/contracts/modules/goals/contract';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { pageArgs, toPage } from '#/infrastructure/database/pagination';
import {
  adminGoalWhere,
  detailSelect,
  listSelect,
  memberGoalWhere,
} from './queries';
import { summarizeGoal, summarizeGoalDetail } from './views';

const DEFAULT_LIMIT = 12;

const make = Effect.gen(function* () {
  const database = yield* Database;

  const list = Effect.fn('Goals.list')(function* (
    userId: string,
    query: typeof GoalsQuery.Type,
  ) {
    const { limit, args } = pageArgs({
      cursor: query.cursor,
      limit: query.limit ?? DEFAULT_LIMIT,
    });
    const where = {
      ...memberGoalWhere(userId),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
    const [total, rows] = yield* Effect.all(
      [
        database.use((db) => db.goal.count({ where })),
        database.use((db) =>
          db.goal.findMany({ where, ...args, select: listSelect }),
        ),
      ],
      { concurrency: 2 },
    );
    const page = toPage(rows, limit, total);
    return { ...page, data: page.data.map(summarizeGoal) };
  });

  const get = Effect.fn('Goals.get')(function* (
    userId: string,
    goalId: string,
  ) {
    const goal = yield* database.use((db) =>
      db.goal.findFirst({
        where: memberGoalWhere(userId, goalId),
        select: detailSelect,
      }),
    );
    if (!goal) return yield* new GoalNotFound();
    return summarizeGoalDetail(goal, userId);
  });

  const create = Effect.fn('Goals.create')(function* (
    user: { id: string; name: string },
    input: typeof CreateGoalPayload.Type,
  ) {
    const title = input.name.trim();
    if (!title) return yield* new GoalNameRequired();

    const installmentAmount =
      input.installmentAmount ?? input.targetAmount / input.installmentCount;
    const goalType = input.goalType ?? 'saving';
    const contributionMode = input.contributionMode ?? 'manual';
    const participants = normalizeParticipants(input.participants, user.id);
    const now = new Date();

    return yield* database.transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          id: crypto.randomUUID(),
          name: title,
          type: 'meta',
          createdAt: now,
          updatedAt: now,
          ownerId: user.id,
          inviteCode: crypto.randomUUID().slice(0, 8),
        },
        select: { id: true, owner: { select: { name: true } } },
      });
      const ownerMember = await tx.groupMember.create({
        data: {
          userId: user.id,
          groupId: group.id,
          name: user.name.trim() || group.owner?.name || 'Usuario',
          role: 'admin',
          joinedAt: now,
        },
        select: { id: true, name: true },
      });
      if (participants.length > 0) {
        await tx.groupMember.createMany({
          data: participants.map((participant) => ({
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
          title,
          description: input.description?.trim() || null,
          goalType,
          emoji: input.emoji?.trim() || null,
          coverImageUrl: input.coverImageUrl?.trim() || null,
          themeColor: input.themeColor?.trim() || null,
          contributionMode,
          currency: input.currency,
          targetAmount: input.targetAmount,
          startDate: input.startDate,
          endDate: input.endDate,
          installmentCount: input.installmentCount,
          installmentAmount,
          suggestedContributionAmount:
            input.suggestedContributionAmount ?? null,
        },
        select: { id: true },
      });
      await tx.activityLog.create({
        data: {
          groupId: group.id,
          actorUserId: user.id,
          actorName: ownerMember.name,
          action: 'goal.created',
          targetName: title,
          details: {
            goalId: goal.id,
            targetAmount: input.targetAmount,
            currency: input.currency,
            installmentCount: input.installmentCount,
            installmentAmount,
            goalType,
            contributionMode,
            participantCount: participants.length + 1,
            startDate: input.startDate.toISOString(),
            endDate: input.endDate.toISOString(),
          },
        },
      });
      return { id: goal.id };
    });
  });

  const update = Effect.fn('Goals.update')(function* (
    userId: string,
    goalId: string,
    input: typeof UpdateGoalPayload.Type,
  ) {
    const goal = yield* database.use((db) =>
      db.goal.findFirst({
        where: adminGoalWhere(userId, goalId),
        select: { id: true, groupId: true },
      }),
    );
    if (!goal) return yield* new GoalNotFound();

    const title = input.name?.trim();
    if (title === '') return yield* new GoalNameRequired();

    return yield* database.transaction(async (tx) => {
      const updated = await tx.goal.update({
        where: { id: goal.id },
        data: {
          title,
          description: trimmedOrNull(input.description),
          goalType: input.goalType,
          emoji: trimmedOrNull(input.emoji),
          coverImageUrl: trimmedOrNull(input.coverImageUrl),
          themeColor: input.themeColor,
          contributionMode: input.contributionMode,
          currency: input.currency?.trim().toUpperCase(),
          targetAmount: input.targetAmount,
          startDate: input.startDate,
          endDate: input.endDate,
          installmentCount: input.installmentCount,
          installmentAmount: input.installmentAmount,
          suggestedContributionAmount: input.suggestedContributionAmount,
        },
        select: { id: true },
      });
      if (title !== undefined) {
        await tx.group.update({
          where: { id: goal.groupId },
          data: { name: title, updatedAt: new Date() },
        });
      }
      return updated;
    });
  });

  return { list, get, create, update };
});

export class Goals extends Context.Service<
  Goals,
  Effect.Success<typeof make>
>()('vornway/goals/Goals') {
  static readonly layer = Layer.effect(Goals, make);
}

const trimmedOrNull = (value: string | null | undefined) =>
  value === undefined ? undefined : value?.trim() || null;

const normalizeParticipants = (
  participants: typeof CreateGoalPayload.Type.participants,
  ownerId: string,
) =>
  (participants ?? [])
    .map((participant) => ({
      name: participant.name.trim(),
      userId: participant.userId?.trim() || null,
    }))
    .filter((participant) => participant.name.length > 0)
    .filter((participant) => participant.userId !== ownerId)
    .filter(
      (participant, index, all) =>
        all.findIndex(
          (other) =>
            (other.userId && other.userId === participant.userId) ||
            (!other.userId &&
              other.name.toLocaleLowerCase('es-CO') ===
                participant.name.toLocaleLowerCase('es-CO')),
        ) === index,
    );
