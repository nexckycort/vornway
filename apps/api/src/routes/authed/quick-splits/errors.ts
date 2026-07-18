import { AppError } from '#/shared/errors/app-error';

export class QuickSplitParticipantsRequiredError extends AppError<400> {
  constructor() {
    super({
      status: 400,
      code: 'QUICK_SPLIT_PARTICIPANTS_REQUIRED',
      message: 'Debes incluir al menos un participante registrado',
    });
  }
}

export class QuickSplitParticipantsNotFoundError extends AppError<400> {
  constructor(_input: { missingUserIds: string[] }) {
    super({
      status: 400,
      code: 'QUICK_SPLIT_PARTICIPANTS_NOT_FOUND',
      message: 'Uno o más participantes no existen',
    });
  }
}

export class QuickSplitCreateError extends AppError<500> {
  constructor(input: { cause: unknown }) {
    super({
      status: 500,
      code: 'QUICK_SPLIT_CREATE_FAILED',
      message: 'No se pudo crear el gasto rápido',
      cause: input.cause,
    });
  }
}

export class QuickSplitNotFoundError extends AppError<404> {
  constructor(_input: { quickSplitId: string }) {
    super({
      status: 404,
      code: 'QUICK_SPLIT_NOT_FOUND',
      message: 'Gasto rápido no encontrado',
    });
  }
}

export class QuickSplitExpenseParticipantsInvalidError extends AppError<400> {
  constructor(_input: { invalidUserIds: string[] }) {
    super({
      status: 400,
      code: 'QUICK_SPLIT_EXPENSE_PARTICIPANTS_INVALID',
      message: 'Uno o más participantes no pertenecen al gasto rápido',
    });
  }
}

export class QuickSplitExpensePayerInvalidError extends AppError<400> {
  constructor(_input: { paidByUserId: string }) {
    super({
      status: 400,
      code: 'QUICK_SPLIT_EXPENSE_PAYER_INVALID',
      message: 'El pagador no pertenece al gasto rápido',
    });
  }
}

export class QuickSplitExpenseSharesInvalidError extends AppError<400> {
  constructor(_input: { reason: string }) {
    super({
      status: 400,
      code: 'QUICK_SPLIT_EXPENSE_SHARES_INVALID',
      message: 'La división del gasto no es válida',
    });
  }
}

export class QuickSplitExpenseCreateError extends AppError<500> {
  constructor(input: { cause: unknown }) {
    super({
      status: 500,
      code: 'QUICK_SPLIT_EXPENSE_CREATE_FAILED',
      message: 'No se pudo crear el gasto del quick split',
      cause: input.cause,
    });
  }
}

export class QuickSplitExpenseNotFoundError extends AppError<404> {
  constructor(_input: { expenseId: string }) {
    super({
      status: 404,
      code: 'QUICK_SPLIT_EXPENSE_NOT_FOUND',
      message: 'Gasto con amigos no encontrado',
    });
  }
}

export class QuickSplitExpensesListError extends AppError<500> {
  constructor(input: { cause: unknown }) {
    super({
      status: 500,
      code: 'QUICK_SPLIT_EXPENSES_LIST_FAILED',
      message: 'No se pudieron cargar los gastos con amigos',
      cause: input.cause,
    });
  }
}

export class QuickSplitExpenseDetailError extends AppError<500> {
  constructor(input: { cause: unknown }) {
    super({
      status: 500,
      code: 'QUICK_SPLIT_EXPENSE_DETAIL_FAILED',
      message: 'No se pudo cargar el detalle del gasto con amigos',
      cause: input.cause,
    });
  }
}

export class QuickSplitExpenseDeleteError extends AppError<500> {
  constructor(input: { cause: unknown }) {
    super({
      status: 500,
      code: 'QUICK_SPLIT_EXPENSE_DELETE_FAILED',
      message: 'No se pudo eliminar el gasto con amigos',
      cause: input.cause,
    });
  }
}
