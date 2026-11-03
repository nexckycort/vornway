import type { InternalError } from '@vornway/contracts/errors';
import {
  DebtAmountNotFound,
  DebtAmountRequired,
  DebtNotFound,
} from '@vornway/contracts/modules/debts/errors';
import type {
  Debt,
  DebtAmountPayload,
  UpdateDebtAmountPayload,
} from '@vornway/contracts/modules/debts/schemas';
import type { InvalidFinanceAccount } from '@vornway/contracts/modules/finances/errors';
import { Context, DateTime, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { applyAccountTransactionEffect } from '#/modules/finances/account-balance';
import { money } from '#/modules/finances/money';
import { DebtAccounts } from './accounts';
import {
  expectedTotalFor,
  loanTransactionType,
  sumAmounts,
} from './calculations';
import { Debts } from './service';

type DebtView = typeof Debt.Type;

export class DebtAmounts extends Context.Service<
  DebtAmounts,
  {
    add(
      userId: string,
      debtId: string,
      input: typeof DebtAmountPayload.Type,
    ): Effect.Effect<
      DebtView,
      DebtNotFound | InvalidFinanceAccount | InternalError
    >;
    update(
      userId: string,
      debtId: string,
      amountId: string,
      input: typeof UpdateDebtAmountPayload.Type,
    ): Effect.Effect<
      DebtView,
      DebtNotFound | DebtAmountNotFound | InvalidFinanceAccount | InternalError
    >;
    delete(
      userId: string,
      debtId: string,
      amountId: string,
    ): Effect.Effect<
      DebtView,
      DebtNotFound | DebtAmountNotFound | DebtAmountRequired | InternalError
    >;
  }
>()('@vornway/api/modules/debts/amounts/DebtAmounts') {
  static readonly layer = Layer.effect(
    DebtAmounts,
    Effect.gen(function* () {
      const database = yield* Database;
      const accounts = yield* DebtAccounts;
      const debts = yield* Debts;

      const add = Effect.fn('DebtAmounts.add')(function* (
        userId: string,
        debtId: string,
        input: typeof DebtAmountPayload.Type,
      ) {
        const debt = yield* database.use((db) =>
          db.debt.findFirst({ where: { id: debtId, ownerId: userId } }),
        );
        if (!debt) return yield* new DebtNotFound();
        yield* accounts.require(userId, input.accountId, debt.currency);

        const principalAmount = money(debt.principalAmount + input.amount);
        const now = yield* DateTime.nowAsDate;
        yield* database.transaction(async (tx) => {
          await tx.debtAmount.create({
            data: {
              debtId,
              accountId: input.accountId,
              amount: input.amount,
              loanDate: input.loanDate,
            },
          });
          await tx.debt.update({
            where: { id: debtId },
            data: {
              principalAmount,
              expectedTotal: expectedTotalFor(
                principalAmount,
                debt.interestType,
                debt.interestValue,
              ),
              updatedAt: now,
            },
          });
          await applyAccountTransactionEffect(
            tx,
            {
              accountId: input.accountId,
              type: loanTransactionType(debt.direction),
              amount: input.amount,
            },
            1,
          );
        });
        return yield* debts.get(userId, debtId);
      });

      const update = Effect.fn('DebtAmounts.update')(function* (
        userId: string,
        debtId: string,
        amountId: string,
        input: typeof UpdateDebtAmountPayload.Type,
      ) {
        const amount = yield* database.use((db) =>
          db.debtAmount.findFirst({
            where: { id: amountId, debtId, debt: { ownerId: userId } },
            include: { debt: { include: { amounts: true } } },
          }),
        );
        if (!amount) return yield* new DebtAmountNotFound();
        yield* accounts.require(
          userId,
          input.accountId ?? amount.accountId,
          amount.debt.currency,
        );

        const nextAmount = input.amount ?? amount.amount;
        const principalAmount = sumAmounts(
          amount.debt.amounts.map((item) =>
            item.id === amountId ? { amount: nextAmount } : item,
          ),
        );
        const type = loanTransactionType(amount.debt.direction);

        const now = yield* DateTime.nowAsDate;
        yield* database.transaction(async (tx) => {
          await applyAccountTransactionEffect(
            tx,
            { accountId: amount.accountId, type, amount: amount.amount },
            -1,
          );
          await tx.debtAmount.update({
            where: { id: amountId },
            data: {
              ...(input.amount === undefined ? {} : { amount: input.amount }),
              ...(input.accountId === undefined
                ? {}
                : { accountId: input.accountId }),
              ...(input.loanDate === undefined
                ? {}
                : { loanDate: input.loanDate }),
            },
          });
          await tx.debt.update({
            where: { id: debtId },
            data: {
              principalAmount,
              expectedTotal: expectedTotalFor(
                principalAmount,
                amount.debt.interestType,
                amount.debt.interestValue,
              ),
              updatedAt: now,
            },
          });
          await applyAccountTransactionEffect(
            tx,
            {
              accountId: input.accountId ?? amount.accountId,
              type,
              amount: nextAmount,
            },
            1,
          );
        });
        return yield* debts.get(userId, debtId);
      });

      const remove = Effect.fn('DebtAmounts.delete')(function* (
        userId: string,
        debtId: string,
        amountId: string,
      ) {
        const amount = yield* database.use((db) =>
          db.debtAmount.findFirst({
            where: { id: amountId, debtId, debt: { ownerId: userId } },
            include: { debt: { include: { amounts: true } } },
          }),
        );
        if (!amount) return yield* new DebtAmountNotFound();
        if (amount.debt.amounts.length <= 1) {
          return yield* new DebtAmountRequired();
        }

        const principalAmount = sumAmounts(
          amount.debt.amounts.filter((item) => item.id !== amountId),
        );
        const now = yield* DateTime.nowAsDate;
        yield* database.transaction(async (tx) => {
          await applyAccountTransactionEffect(
            tx,
            {
              accountId: amount.accountId,
              type: loanTransactionType(amount.debt.direction),
              amount: amount.amount,
            },
            -1,
          );
          await tx.debtAmount.delete({ where: { id: amountId } });
          await tx.debt.update({
            where: { id: debtId },
            data: {
              principalAmount,
              expectedTotal: expectedTotalFor(
                principalAmount,
                amount.debt.interestType,
                amount.debt.interestValue,
              ),
              updatedAt: now,
            },
          });
        });
        return yield* debts.get(userId, debtId);
      });

      return DebtAmounts.of({ add, update, delete: remove });
    }),
  );
}
