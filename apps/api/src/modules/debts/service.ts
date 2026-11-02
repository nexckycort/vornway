import type { InternalError } from '@vornway/contracts/errors';
import {
  DebtAssignedToSelf,
  DebtCounterpartyNotFound,
  DebtNotFound,
} from '@vornway/contracts/modules/debts/errors';
import type {
  CreateDebtPayload,
  Debt,
  DebtAmountPayload,
  DebtListQuery,
  UpdateDebtPayload,
} from '@vornway/contracts/modules/debts/schemas';
import type { InvalidFinanceAccount } from '@vornway/contracts/modules/finances/errors';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { applyAccountTransactionEffect } from '#/modules/finances/account-balance';
import { DebtAccounts } from './accounts';
import {
  debtInclude,
  expectedTotalFor,
  loanTransactionType,
  paymentTransactionType,
  sumAmounts,
  toDebtView,
  visibleTo,
} from './calculations';

type DebtView = typeof Debt.Type;

export class Debts extends Context.Service<
  Debts,
  {
    list(
      userId: string,
      query: typeof DebtListQuery.Type,
    ): Effect.Effect<DebtView[], InternalError>;
    get(
      userId: string,
      debtId: string,
    ): Effect.Effect<DebtView, DebtNotFound | InternalError>;
    create(
      userId: string,
      input: typeof CreateDebtPayload.Type,
    ): Effect.Effect<
      DebtView,
      | DebtAssignedToSelf
      | DebtCounterpartyNotFound
      | InvalidFinanceAccount
      | InternalError
    >;
    update(
      userId: string,
      debtId: string,
      input: typeof UpdateDebtPayload.Type,
    ): Effect.Effect<
      DebtView,
      | DebtNotFound
      | DebtAssignedToSelf
      | DebtCounterpartyNotFound
      | InternalError
    >;
    delete(
      userId: string,
      debtId: string,
    ): Effect.Effect<void, DebtNotFound | InternalError>;
  }
>()('vornway/debts/Debts') {
  static readonly layer = Layer.effect(
    Debts,
    Effect.gen(function* () {
      const database = yield* Database;
      const accounts = yield* DebtAccounts;

      const list = Effect.fn('Debts.list')(function* (
        userId: string,
        query: typeof DebtListQuery.Type,
      ) {
        const debts = yield* database.use((db) =>
          db.debt.findMany({
            where: {
              ...visibleTo(userId),
              ...(query.search
                ? {
                    OR: [
                      { name: { contains: query.search, mode: 'insensitive' } },
                      {
                        counterpartyName: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  }
                : {}),
            },
            include: debtInclude,
            orderBy: { createdAt: 'desc' },
          }),
        );
        return debts
          .map((debt) => toDebtView(debt, userId))
          .filter(
            (debt) => query.status === 'all' || debt.status === query.status,
          );
      });

      const get = Effect.fn('Debts.get')(function* (
        userId: string,
        debtId: string,
      ) {
        const debt = yield* database.use((db) =>
          db.debt.findFirst({
            where: { id: debtId, ...visibleTo(userId) },
            include: {
              ...debtInclude,
              payments: {
                orderBy: { paidAt: 'desc' },
                include: { account: true },
              },
            },
          }),
        );
        if (!debt) return yield* new DebtNotFound();
        return toDebtView(debt, userId);
      });

      const requireCounterparty = Effect.fn('Debts.requireCounterparty')(
        function* (userId: string, counterpartyId: string | null | undefined) {
          if (counterpartyId === userId) return yield* new DebtAssignedToSelf();
          if (!counterpartyId) return;
          const counterparty = yield* database.use((db) =>
            db.user.findUnique({
              where: { id: counterpartyId },
              select: { id: true },
            }),
          );
          if (!counterparty) return yield* new DebtCounterpartyNotFound();
        },
      );

      const create = Effect.fn('Debts.create')(function* (
        userId: string,
        input: typeof CreateDebtPayload.Type,
      ) {
        yield* requireCounterparty(userId, input.counterpartyId);
        const currency = input.currency.toUpperCase();
        const amounts: ReadonlyArray<typeof DebtAmountPayload.Type> =
          input.amounts ?? [
            { amount: input.principalAmount, loanDate: new Date() },
          ];
        yield* Effect.forEach(
          amounts,
          (amount) => accounts.require(userId, amount.accountId, currency),
          { discard: true },
        );
        const principalAmount = sumAmounts(amounts);

        const debt = yield* database.transaction(async (tx) => {
          const created = await tx.debt.create({
            data: {
              ownerId: userId,
              name: input.name,
              counterpartyName: input.counterpartyName,
              counterpartyId: input.counterpartyId,
              direction: input.direction,
              principalAmount,
              interestType: input.interestType,
              interestValue: input.interestValue,
              expectedTotal: expectedTotalFor(
                principalAmount,
                input.interestType,
                input.interestValue,
              ),
              amounts: { create: [...amounts] },
              currency,
              dueDate: input.dueDate,
              description: input.description,
            },
            include: debtInclude,
          });
          for (const amount of amounts) {
            await applyAccountTransactionEffect(
              tx,
              {
                accountId: amount.accountId,
                type: loanTransactionType(input.direction),
                amount: amount.amount,
              },
              1,
            );
          }
          return created;
        });
        return toDebtView(debt, userId);
      });

      const update = Effect.fn('Debts.update')(function* (
        userId: string,
        debtId: string,
        input: typeof UpdateDebtPayload.Type,
      ) {
        const existing = yield* database.use((db) =>
          db.debt.findFirst({
            where: { id: debtId, ownerId: userId },
            include: debtInclude,
          }),
        );
        if (!existing) return yield* new DebtNotFound();
        yield* requireCounterparty(userId, input.counterpartyId);

        const amounts = input.amounts ?? existing.amounts;
        const principalAmount = sumAmounts(amounts);

        const debt = yield* database.use((db) =>
          db.debt.update({
            where: { id: debtId },
            data: {
              name: input.name,
              counterpartyName: input.counterpartyName,
              counterpartyId: input.counterpartyId,
              direction: input.direction,
              principalAmount,
              ...(input.amounts
                ? { amounts: { deleteMany: {}, create: [...input.amounts] } }
                : {}),
              currency: input.currency?.toUpperCase(),
              interestType: input.interestType,
              interestValue: input.interestValue,
              dueDate: input.dueDate,
              description: input.description,
              expectedTotal: expectedTotalFor(
                principalAmount,
                input.interestType ?? existing.interestType,
                input.interestValue ?? existing.interestValue,
              ),
            },
            include: debtInclude,
          }),
        );
        return toDebtView(debt, userId);
      });

      const remove = Effect.fn('Debts.delete')(function* (
        userId: string,
        debtId: string,
      ) {
        const debt = yield* database.use((db) =>
          db.debt.findFirst({
            where: { id: debtId, ownerId: userId },
            include: { payments: true, amounts: true },
          }),
        );
        if (!debt) return yield* new DebtNotFound();

        yield* database.transaction(async (tx) => {
          for (const payment of debt.payments) {
            await applyAccountTransactionEffect(
              tx,
              {
                accountId: payment.accountId,
                type: paymentTransactionType(debt.direction),
                amount: payment.amount,
              },
              -1,
            );
          }
          for (const amount of debt.amounts) {
            await applyAccountTransactionEffect(
              tx,
              {
                accountId: amount.accountId,
                type: loanTransactionType(debt.direction),
                amount: amount.amount,
              },
              -1,
            );
          }
          await tx.debt.delete({ where: { id: debtId } });
        });
      });

      return Debts.of({
        list,
        get,
        create,
        update,
        delete: remove,
      });
    }),
  );
}
