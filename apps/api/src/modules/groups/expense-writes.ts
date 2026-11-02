import type { InternalError } from '@vornway/contracts/errors';
import {
  GroupAccessDenied,
  type GroupExpenseCategoryInvalid,
  type GroupExpenseDeleted,
  GroupExpenseIdConflict,
  type GroupExpenseLineItemsInvalid,
  GroupExpenseNotFound,
  type GroupExpenseParticipantsInvalid,
  type GroupExpensePayerInvalid,
  GroupSettlementParticipantsInvalid,
} from '@vornway/contracts/modules/groups/errors';
import type {
  ExpenseRef,
  SettlementPayload,
} from '@vornway/contracts/modules/groups/expense-schemas';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { makeInternalFailure } from '#/modules/shared/internal-failure';
import { ExpenseAttachments } from './attachments';
import { makeExpenseNotifier } from './expense-notifier';
import { type ExpenseInput, makeExpensePlanner } from './expense-plan';
import {
  insertExpense,
  markExpenseDeleted,
  rewriteExpense,
} from './expense-tx';
import { membershipOf, required } from './helpers';
import { rollbackable } from './transaction';

type PlanError =
  | GroupExpensePayerInvalid
  | GroupExpenseCategoryInvalid
  | GroupExpenseParticipantsInvalid;

export class GroupExpenseWrites extends Context.Service<
  GroupExpenseWrites,
  {
    create(
      userId: string,
      groupId: string,
      payload: ExpenseInput,
    ): Effect.Effect<
      typeof ExpenseRef.Type,
      | GroupAccessDenied
      | GroupExpenseIdConflict
      | PlanError
      | GroupExpenseLineItemsInvalid
      | InternalError
    >;
    update(
      userId: string,
      groupId: string,
      expenseId: string,
      payload: ExpenseInput,
    ): Effect.Effect<
      typeof ExpenseRef.Type,
      | GroupAccessDenied
      | PlanError
      | GroupExpenseNotFound
      | GroupExpenseDeleted
      | GroupExpenseLineItemsInvalid
      | InternalError
    >;
    remove(
      userId: string,
      groupId: string,
      expenseId: string,
    ): Effect.Effect<
      typeof ExpenseRef.Type,
      GroupAccessDenied | GroupExpenseNotFound | InternalError
    >;
    settle(
      userId: string,
      groupId: string,
      payload: typeof SettlementPayload.Type,
    ): Effect.Effect<
      typeof ExpenseRef.Type,
      GroupAccessDenied | GroupSettlementParticipantsInvalid | InternalError
    >;
  }
>()('vornway/groups/GroupExpenseWrites') {
  static readonly layer = Layer.effect(
    GroupExpenseWrites,
    Effect.gen(function* () {
      const database = yield* Database;
      const attachments = yield* ExpenseAttachments;
      const plan = yield* makeExpensePlanner;
      const notifyCreated = yield* makeExpenseNotifier;
      const failInternal = yield* makeInternalFailure;
      const transact = rollbackable(database);

      const requireMembership = (userId: string, groupId: string) =>
        database
          .use((db) =>
            db.groupMember.findFirst({
              where: membershipOf(userId, groupId),
              select: {
                id: true,
                name: true,
                group: { select: { type: true } },
              },
            }),
          )
          .pipe(required(() => new GroupAccessDenied()));

      const uploadAttachment = (
        groupId: string,
        expenseId: string,
        dataUrl: string,
      ) =>
        attachments
          .upload({ groupId, expenseId, dataUrl })
          .pipe(Effect.catchTag('AttachmentError', failInternal));

      const create = Effect.fn('GroupExpenseWrites.create')(function* (
        userId: string,
        groupId: string,
        payload: ExpenseInput,
      ) {
        const membership = yield* requireMembership(userId, groupId);

        const expenseId = payload.id?.trim();
        if (expenseId) {
          const existing = yield* database.use((db) =>
            db.expense.findUnique({
              where: { id: expenseId },
              select: { id: true, groupId: true },
            }),
          );
          if (existing) {
            if (existing.groupId !== groupId) {
              return yield* new GroupExpenseIdConflict();
            }
            return { id: existing.id };
          }
        }

        const expensePlan = yield* plan(
          userId,
          groupId,
          membership.group.type,
          payload,
        );
        const created = yield* transact<
          { id: string },
          GroupExpenseLineItemsInvalid
        >((tx, abort) =>
          insertExpense(tx, abort, {
            userId,
            groupId,
            expenseId,
            actorName: membership.name,
            payload,
            plan: expensePlan,
          }),
        );

        if (payload.attachmentImage) {
          const attachment = yield* uploadAttachment(
            groupId,
            created.id,
            payload.attachmentImage.dataUrl,
          );
          yield* database.use((db) =>
            db.expense.update({
              where: { id: created.id },
              data: { attachment },
            }),
          );
        }

        yield* Effect.forkDetach(
          notifyCreated({
            userId,
            groupId,
            expenseId: created.id,
            description: payload.description,
            amount: payload.amount,
            currency: payload.currency,
            creatorName: membership.name,
            payerIds: expensePlan.payerIds,
            participantIds: expensePlan.participantIds,
          }).pipe(Effect.ignore({ log: true })),
        );
        return created;
      });

      const update = Effect.fn('GroupExpenseWrites.update')(function* (
        userId: string,
        groupId: string,
        expenseId: string,
        payload: ExpenseInput,
      ) {
        const membership = yield* requireMembership(userId, groupId);
        const expensePlan = yield* plan(
          userId,
          groupId,
          membership.group.type,
          payload,
        );
        const updated = yield* transact<
          { id: string; previousAttachment: string | null },
          | GroupExpenseNotFound
          | GroupExpenseDeleted
          | GroupExpenseLineItemsInvalid
        >((tx, abort) =>
          rewriteExpense(tx, abort, {
            userId,
            groupId,
            expenseId,
            actorName: membership.name,
            payload,
            plan: expensePlan,
          }),
        );

        if (payload.attachmentImage) {
          const attachment = yield* uploadAttachment(
            groupId,
            updated.id,
            payload.attachmentImage.dataUrl,
          );
          yield* database.use((db) =>
            db.expense.update({
              where: { id: updated.id },
              data: { attachment },
            }),
          );
          if (
            updated.previousAttachment &&
            updated.previousAttachment !== attachment
          ) {
            yield* attachments
              .remove(updated.previousAttachment)
              .pipe(Effect.ignore({ log: true }));
          }
        }
        return { id: updated.id };
      });

      const remove = Effect.fn('GroupExpenseWrites.remove')(function* (
        userId: string,
        groupId: string,
        expenseId: string,
      ) {
        const membership = yield* requireMembership(userId, groupId);
        const expense = yield* database
          .use((db) =>
            db.expense.findFirst({
              where: { id: expenseId, groupId },
              select: {
                id: true,
                amount: true,
                accountId: true,
                attachment: true,
                currency: true,
                description: true,
                notes: true,
                status: true,
                deletedAt: true,
              },
            }),
          )
          .pipe(required(() => new GroupExpenseNotFound()));
        if (
          expense.status === 'DELETED' ||
          expense.deletedAt ||
          expense.notes?.includes('[DELETED]')
        ) {
          return { id: expense.id };
        }

        yield* database.transaction((tx) =>
          markExpenseDeleted(tx, {
            userId,
            groupId,
            actorName: membership.name,
            expense,
          }),
        );
        if (expense.attachment) {
          yield* attachments
            .remove(expense.attachment)
            .pipe(Effect.ignore({ log: true }));
        }
        return { id: expense.id };
      });

      const settle = Effect.fn('GroupExpenseWrites.settle')(function* (
        userId: string,
        groupId: string,
        payload: typeof SettlementPayload.Type,
      ) {
        const membership = yield* requireMembership(userId, groupId);
        const members = yield* database.use((db) =>
          db.groupMember.findMany({
            where: {
              groupId,
              id: { in: [payload.fromMemberId, payload.toMemberId] },
            },
            select: { id: true, name: true },
          }),
        );
        const from = members.find(
          (member) => member.id === payload.fromMemberId,
        );
        const to = members.find((member) => member.id === payload.toMemberId);
        if (!from || !to || from.id === to.id) {
          return yield* new GroupSettlementParticipantsInvalid();
        }

        return yield* database.transaction(async (tx) => {
          const created = await tx.expense.create({
            data: {
              groupId,
              paidById: from.id,
              description: `Liquidación: ${from.name} -> ${to.name}`,
              amount: payload.amount,
              currency: payload.currency,
              notes: `[SETTLEMENT:FLEX] ${new Date().toISOString()} by ${membership.id}`,
              payers: {
                create: [{ memberId: from.id, amount: payload.amount }],
              },
              participants: {
                create: [{ memberId: to.id, share: payload.amount }],
              },
            },
            select: { id: true },
          });
          await tx.activityLog.create({
            data: {
              groupId,
              actorUserId: userId,
              actorName: membership.name,
              action: 'debt.settled',
              targetName: `${from.name} -> ${to.name}`,
              details: {
                expenseId: created.id,
                fromMemberId: from.id,
                toMemberId: to.id,
                amount: payload.amount,
                currency: payload.currency,
              },
            },
          });
          return created;
        });
      });

      return GroupExpenseWrites.of({ create, update, remove, settle });
    }),
  );
}
