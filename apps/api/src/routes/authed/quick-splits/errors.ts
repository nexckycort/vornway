import { Data } from 'effect';
import type { ErrorMetadata } from '#/shared/errors/error-metadata';

export class QuickSplitParticipantsRequiredError
  extends Data.TaggedError('QuickSplitParticipantsRequiredError')<{
    readonly details?: never;
  }>
  implements ErrorMetadata<400>
{
  readonly code = 'QUICK_SPLIT_PARTICIPANTS_REQUIRED';
  readonly message = 'Debes incluir al menos un participante registrado';
  readonly status = 400 as const;
}

export class QuickSplitParticipantsNotFoundError
  extends Data.TaggedError('QuickSplitParticipantsNotFoundError')<{
    missingUserIds: string[];
  }>
  implements ErrorMetadata<400>
{
  readonly code = 'QUICK_SPLIT_PARTICIPANTS_NOT_FOUND';
  readonly message = 'Uno o más participantes no existen';
  readonly status = 400 as const;
}

export class QuickSplitCreateError
  extends Data.TaggedError('QuickSplitCreateError')<{
    cause: unknown;
  }>
  implements ErrorMetadata<500>
{
  readonly code = 'QUICK_SPLIT_CREATE_FAILED';
  readonly message = 'No se pudo crear el gasto rápido';
  readonly status = 500 as const;
}

export class QuickSplitNotFoundError
  extends Data.TaggedError('QuickSplitNotFoundError')<{
    quickSplitId: string;
  }>
  implements ErrorMetadata<404>
{
  readonly code = 'QUICK_SPLIT_NOT_FOUND';
  readonly message = 'Gasto rápido no encontrado';
  readonly status = 404 as const;
}

export class QuickSplitExpenseParticipantsInvalidError
  extends Data.TaggedError('QuickSplitExpenseParticipantsInvalidError')<{
    invalidUserIds: string[];
  }>
  implements ErrorMetadata<400>
{
  readonly code = 'QUICK_SPLIT_EXPENSE_PARTICIPANTS_INVALID';
  readonly message = 'Uno o más participantes no pertenecen al gasto rápido';
  readonly status = 400 as const;
}

export class QuickSplitExpensePayerInvalidError
  extends Data.TaggedError('QuickSplitExpensePayerInvalidError')<{
    paidByUserId: string;
  }>
  implements ErrorMetadata<400>
{
  readonly code = 'QUICK_SPLIT_EXPENSE_PAYER_INVALID';
  readonly message = 'El pagador no pertenece al gasto rápido';
  readonly status = 400 as const;
}

export class QuickSplitExpenseSharesInvalidError
  extends Data.TaggedError('QuickSplitExpenseSharesInvalidError')<{
    reason: string;
  }>
  implements ErrorMetadata<400>
{
  readonly code = 'QUICK_SPLIT_EXPENSE_SHARES_INVALID';
  readonly message = 'La división del gasto no es válida';
  readonly status = 400 as const;
}

export class QuickSplitExpenseCreateError
  extends Data.TaggedError('QuickSplitExpenseCreateError')<{
    cause: unknown;
  }>
  implements ErrorMetadata<500>
{
  readonly code = 'QUICK_SPLIT_EXPENSE_CREATE_FAILED';
  readonly message = 'No se pudo crear el gasto del quick split';
  readonly status = 500 as const;
}

export class QuickSplitExpensesListError
  extends Data.TaggedError('QuickSplitExpensesListError')<{
    cause: unknown;
  }>
  implements ErrorMetadata<500>
{
  readonly code = 'QUICK_SPLIT_EXPENSES_LIST_FAILED';
  readonly message = 'No se pudieron cargar los gastos con amigos';
  readonly status = 500 as const;
}
