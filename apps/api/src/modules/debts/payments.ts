import type { InternalError } from '@vornway/contracts/errors';
import {
  DebtNotFound,
  DebtPaymentExceedsBalance,
  DebtPaymentNotFound,
} from '@vornway/contracts/modules/debts/errors';
import type {
  CreatePaymentPayload,
  Debt,
  UpdatePaymentPayload,
} from '@vornway/contracts/modules/debts/schemas';
import type { InvalidFinanceAccount } from '@vornway/contracts/modules/finances/errors';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { applyAccountTransactionEffect } from '#/modules/finances/account-balance';
import { DebtAccounts } from './accounts';
import { paymentTransactionType, sumAmounts } from './calculations';
import { Debts } from './service';

type DebtView = typeof Debt.Type;

export class DebtPayments extends Context.Service<
  DebtPayments,
  {
    add(
      userId: string,
      debtId: string,
      input: typeof CreatePaymentPayload.Type,
    ): Effect.Effect<
      DebtView,
      | DebtNotFound
      | InvalidFinanceAccount
      | DebtPaymentExceedsBalance
      | InternalError
    >;
    update(
      userId: string,
      debtId: string,
      paymentId: string,
      input: typeof UpdatePaymentPayload.Type,
    ): Effect.Effect<
      DebtView,
      | DebtNotFound
      | DebtPaymentNotFound
      | InvalidFinanceAccount
      | DebtPaymentExceedsBalance
      | InternalError
    >;
    delete(
      userId: string,
      debtId: string,
      paymentId: string,
    ): Effect.Effect<
      DebtView,
      DebtNotFound | DebtPaymentNotFound | InternalError
    >;
  }
>()('vornway/debts/DebtPayments') {
  static readonly layer = Layer.effect(
    DebtPayments,
    Effect.gen(function* () {
      const database = yield* Database;
      const accounts = yield* DebtAccounts;
      const debts = yield* Debts;

      const add = Effect.fn('DebtPayments.add')(function* (
        userId: string,
        debtId: string,
        input: typeof CreatePaymentPayload.Type,
      ) {
        const debt = yield* database.use((db) =>
          db.debt.findFirst({
            where: { id: debtId, ownerId: userId },
            include: { payments: true },
          }),
        );
        if (!debt) return yield* new DebtNotFound();
        yield* accounts.require(userId, input.accountId, debt.currency);
        if (
          input.amount >
          debt.expectedTotal - sumAmounts(debt.payments) + 0.01
        ) {
          return yield* new DebtPaymentExceedsBalance();
        }

        yield* database.transaction(async (tx) => {
          const payment = await tx.debtPayment.create({
            data: {
              debtId,
              accountId: input.accountId,
              amount: input.amount,
              paidAt: input.paidAt,
              note: input.note,
            },
          });
          await tx.debt.update({
            where: { id: debtId },
            data: { updatedAt: new Date() },
          });
          await applyAccountTransactionEffect(
            tx,
            {
              accountId: payment.accountId,
              type: paymentTransactionType(debt.direction),
              amount: payment.amount,
            },
            1,
          );
        });
        return yield* debts.get(userId, debtId);
      });

      const update = Effect.fn('DebtPayments.update')(function* (
        userId: string,
        debtId: string,
        paymentId: string,
        input: typeof UpdatePaymentPayload.Type,
      ) {
        const payment = yield* database.use((db) =>
          db.debtPayment.findFirst({
            where: { id: paymentId, debt: { id: debtId, ownerId: userId } },
            include: { debt: { include: { payments: true } } },
          }),
        );
        if (!payment) return yield* new DebtPaymentNotFound();

        const nextAmount = input.amount ?? payment.amount;
        if (input.amount !== undefined) {
          const paidWithoutPayment = sumAmounts(
            payment.debt.payments.filter((item) => item.id !== payment.id),
          );
          if (
            nextAmount >
            payment.debt.expectedTotal - paidWithoutPayment + 0.01
          ) {
            return yield* new DebtPaymentExceedsBalance();
          }
        }
        yield* accounts.require(userId, input.accountId, payment.debt.currency);
        const type = paymentTransactionType(payment.debt.direction);

        yield* database.transaction(async (tx) => {
          await applyAccountTransactionEffect(
            tx,
            { accountId: payment.accountId, type, amount: payment.amount },
            -1,
          );
          await tx.debtPayment.update({
            where: { id: paymentId },
            data: {
              ...(input.amount === undefined ? {} : { amount: input.amount }),
              ...(input.accountId === undefined
                ? {}
                : { accountId: input.accountId }),
              ...(input.paidAt === undefined ? {} : { paidAt: input.paidAt }),
              ...(input.note === undefined ? {} : { note: input.note }),
            },
          });
          await applyAccountTransactionEffect(
            tx,
            {
              accountId:
                input.accountId === undefined
                  ? payment.accountId
                  : input.accountId,
              type,
              amount: nextAmount,
            },
            1,
          );
          await tx.debt.update({
            where: { id: debtId },
            data: { updatedAt: new Date() },
          });
        });
        return yield* debts.get(userId, debtId);
      });

      const remove = Effect.fn('DebtPayments.delete')(function* (
        userId: string,
        debtId: string,
        paymentId: string,
      ) {
        const payment = yield* database.use((db) =>
          db.debtPayment.findFirst({
            where: { id: paymentId, debt: { id: debtId, ownerId: userId } },
            include: { debt: true },
          }),
        );
        if (!payment) return yield* new DebtPaymentNotFound();

        yield* database.transaction(async (tx) => {
          await applyAccountTransactionEffect(
            tx,
            {
              accountId: payment.accountId,
              type: paymentTransactionType(payment.debt.direction),
              amount: payment.amount,
            },
            -1,
          );
          await tx.debtPayment.delete({ where: { id: paymentId } });
          await tx.debt.update({
            where: { id: debtId },
            data: { updatedAt: new Date() },
          });
        });
        return yield* debts.get(userId, debtId);
      });

      return DebtPayments.of({ add, update, delete: remove });
    }),
  );
}
