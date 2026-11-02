import {
  type CreateGoalContributionPayload,
  GoalAccessDenied,
  GoalContributionCreateForbidden,
  GoalContributionDeleteForbidden,
  GoalContributionNotFound,
  GoalNotFound,
  GoalParticipantInvalid,
} from '@vornway/contracts/modules/goals/contract';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { memberGoalWhere } from './queries';

const make = Effect.gen(function* () {
  const database = yield* Database;

  const loadGoalAndActor = Effect.fn('GoalContributions.loadGoalAndActor')(
    function* (userId: string, goalId: string) {
      const goal = yield* database.use((db) =>
        db.goal.findFirst({
          where: memberGoalWhere(userId, goalId),
          select: {
            id: true,
            title: true,
            currency: true,
            targetAmount: true,
            groupId: true,
          },
        }),
      );
      if (!goal) return yield* new GoalNotFound();
      const actor = yield* database.use((db) =>
        db.groupMember.findFirst({
          where: { groupId: goal.groupId, userId },
          select: { id: true, name: true, role: true },
        }),
      );
      if (!actor) return yield* new GoalAccessDenied();
      return { goal, actor };
    },
  );

  const add = Effect.fn('GoalContributions.add')(function* (
    userId: string,
    goalId: string,
    input: typeof CreateGoalContributionPayload.Type,
  ) {
    const { goal, actor } = yield* loadGoalAndActor(userId, goalId);
    if (actor.role !== 'admin') {
      return yield* new GoalContributionCreateForbidden();
    }
    const member = yield* database.use((db) =>
      db.groupMember.findFirst({
        where: { id: input.memberId, groupId: goal.groupId },
        select: { id: true, name: true },
      }),
    );
    if (!member) return yield* new GoalParticipantInvalid();

    return yield* database.transaction(async (tx) => {
      const contribution = await tx.goalContribution.create({
        data: {
          goalId: goal.id,
          memberId: member.id,
          amount: input.amount,
          contributedAt: input.contributedAt ?? new Date(),
          notes: input.notes?.trim() || null,
        },
        select: { id: true },
      });
      await tx.activityLog.create({
        data: {
          groupId: goal.groupId,
          actorUserId: userId,
          actorName: actor.name,
          action: 'goal.contribution.created',
          targetName: goal.title,
          details: {
            goalId: goal.id,
            contributionId: contribution.id,
            amount: input.amount,
            currency: goal.currency,
            memberId: member.id,
            memberName: member.name,
          },
        },
      });
      const totals = await tx.goalContribution.aggregate({
        where: { goalId: goal.id },
        _sum: { amount: true },
      });
      if ((totals._sum.amount ?? 0) >= goal.targetAmount) {
        await tx.goal.update({
          where: { id: goal.id },
          data: { completedAt: new Date() },
        });
      }
      return { id: contribution.id };
    });
  });

  const remove = Effect.fn('GoalContributions.remove')(function* (
    userId: string,
    goalId: string,
    contributionId: string,
  ) {
    const { goal, actor } = yield* loadGoalAndActor(userId, goalId);
    if (actor.role !== 'admin') {
      return yield* new GoalContributionDeleteForbidden();
    }
    const contribution = yield* database.use((db) =>
      db.goalContribution.findFirst({
        where: { id: contributionId, goalId: goal.id },
        select: {
          id: true,
          amount: true,
          member: { select: { id: true, name: true } },
        },
      }),
    );
    if (!contribution) return yield* new GoalContributionNotFound();

    return yield* database.transaction(async (tx) => {
      await tx.goalContribution.delete({ where: { id: contribution.id } });
      await tx.activityLog.create({
        data: {
          groupId: goal.groupId,
          actorUserId: userId,
          actorName: actor.name,
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
      const totals = await tx.goalContribution.aggregate({
        where: { goalId: goal.id },
        _sum: { amount: true },
      });
      if ((totals._sum.amount ?? 0) < goal.targetAmount) {
        await tx.goal.update({
          where: { id: goal.id },
          data: { completedAt: null },
        });
      }
      return { id: contribution.id };
    });
  });

  return { add, remove };
});

export class GoalContributions extends Context.Service<
  GoalContributions,
  Effect.Success<typeof make>
>()('vornway/goals/GoalContributions') {
  static readonly layer = Layer.effect(GoalContributions, make);
}
