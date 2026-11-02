import { Effect, Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import { Cursor, literalsWithFallback, TrimmedString } from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';

const errorFields = <const Code extends string>(
  code: Code,
  message: string,
) => ({
  code: Schema.Literal(code).pipe(
    Schema.withConstructorDefault(Effect.succeed(code)),
  ),
  message: Schema.String.pipe(
    Schema.withConstructorDefault(Effect.succeed(message)),
  ),
});

export class QuickSplitParticipantsRequired extends Schema.TaggedError<QuickSplitParticipantsRequired>()(
  'QuickSplitParticipantsRequired',
  errorFields(
    'QUICK_SPLIT_PARTICIPANTS_REQUIRED',
    'Debes incluir al menos un participante registrado',
  ),
  { httpApiStatus: 400 },
) {}
export class QuickSplitParticipantsNotFound extends Schema.TaggedError<QuickSplitParticipantsNotFound>()(
  'QuickSplitParticipantsNotFound',
  errorFields(
    'QUICK_SPLIT_PARTICIPANTS_NOT_FOUND',
    'Uno o más participantes no existen',
  ),
  { httpApiStatus: 400 },
) {}
export class QuickSplitNotFound extends Schema.TaggedError<QuickSplitNotFound>()(
  'QuickSplitNotFound',
  errorFields('QUICK_SPLIT_NOT_FOUND', 'Gasto rápido no encontrado'),
  { httpApiStatus: 404 },
) {}
export class QuickSplitExpenseNotFound extends Schema.TaggedError<QuickSplitExpenseNotFound>()(
  'QuickSplitExpenseNotFound',
  errorFields(
    'QUICK_SPLIT_EXPENSE_NOT_FOUND',
    'Gasto con amigos no encontrado',
  ),
  { httpApiStatus: 404 },
) {}
export class QuickSplitExpensePayerInvalid extends Schema.TaggedError<QuickSplitExpensePayerInvalid>()(
  'QuickSplitExpensePayerInvalid',
  errorFields(
    'QUICK_SPLIT_EXPENSE_PAYER_INVALID',
    'El pagador no pertenece al gasto rápido',
  ),
  { httpApiStatus: 400 },
) {}
export class QuickSplitExpenseSharesInvalid extends Schema.TaggedError<QuickSplitExpenseSharesInvalid>()(
  'QuickSplitExpenseSharesInvalid',
  errorFields(
    'QUICK_SPLIT_EXPENSE_SHARES_INVALID',
    'La división del gasto no es válida',
  ),
  { httpApiStatus: 400 },
) {}
export class QuickSplitSettlementParticipantsInvalid extends Schema.TaggedError<QuickSplitSettlementParticipantsInvalid>()(
  'QuickSplitSettlementParticipantsInvalid',
  errorFields(
    'QUICK_SPLIT_SETTLEMENT_PARTICIPANTS_INVALID',
    'Los participantes de la liquidación no son válidos',
  ),
  { httpApiStatus: 400 },
) {}
export class QuickSplitSettlementAmountInvalid extends Schema.TaggedError<QuickSplitSettlementAmountInvalid>()(
  'QuickSplitSettlementAmountInvalid',
  errorFields(
    'QUICK_SPLIT_SETTLEMENT_AMOUNT_INVALID',
    'El monto supera el saldo pendiente de la persona seleccionada',
  ),
  { httpApiStatus: 400 },
) {}

const SplitMethod = Schema.Literals(['equal', 'percentage', 'exact']);
const SplitMethodWithFallback = literalsWithFallback(
  ['equal', 'percentage', 'exact'],
  'unknown',
);
const PositiveAmount = Schema.Finite.check(Schema.isGreaterThan(0));
const Shares = Schema.Record(
  Schema.String.check(Schema.isMinLength(1)),
  Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
);
const Currency = TrimmedString.check(
  Schema.isMinLength(3),
  Schema.isMaxLength(3),
);
const Id = Schema.String.check(Schema.isMinLength(1));

export const QuickSplitExpenseMetadata = Schema.Struct({
  category: Schema.optionalKey(TrimmedString.check(Schema.isMaxLength(80))),
  items: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        name: TrimmedString.check(
          Schema.isMinLength(1),
          Schema.isMaxLength(120),
        ),
        amount: PositiveAmount,
      }),
    ).check(Schema.isMaxLength(50)),
  ),
});

const QuickSplitParticipantInput = Schema.Struct({
  clientId: Schema.optionalKey(
    TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
  ),
  name: TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
  userId: Schema.optionalKey(TrimmedString.check(Schema.isMinLength(1))),
});

export const CreateQuickSplit = Schema.Struct({
  id: Schema.optionalKey(Schema.String.check(Schema.isUUID())),
  name: TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
  description: Schema.optionalKey(TrimmedString.check(Schema.isMaxLength(400))),
  participants: Schema.Array(QuickSplitParticipantInput).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(20),
  ),
}).check(
  Schema.makeFilter((data) => {
    const keys = new Set(
      data.participants.map((participant) =>
        participant.userId
          ? `user:${participant.userId}`
          : `name:${participant.name.toLocaleLowerCase('es-CO')}`,
      ),
    );
    return keys.size === data.participants.length
      ? undefined
      : { path: ['participants'], issue: 'No puedes repetir participantes' };
  }),
);

export const CreatedQuickSplit = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  participants: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      clientId: Schema.optionalKey(Schema.String),
      userId: Schema.NullOr(Schema.String),
      name: Schema.String,
      role: Schema.String,
    }),
  ),
  createdAt: Schema.String,
});

export const QuickSplitExpenseInput = Schema.Struct({
  id: Schema.optionalKey(Id),
  description: TrimmedString.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(200),
  ),
  amount: PositiveAmount,
  currency: Currency,
  paidByParticipantId: Schema.optionalKey(Id),
  splitMethod: SplitMethod.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed('equal' as const)),
  ),
  percentageShares: Schema.optionalKey(Shares),
  exactShares: Schema.optionalKey(Shares),
  metadata: Schema.optionalKey(QuickSplitExpenseMetadata),
}).check(
  Schema.makeFilter((data) => {
    if (data.splitMethod === 'percentage' && !data.percentageShares) {
      return {
        path: ['percentageShares'],
        issue: 'Debes enviar percentageShares cuando splitMethod es percentage',
      };
    }
    if (data.splitMethod === 'exact' && !data.exactShares) {
      return {
        path: ['exactShares'],
        issue: 'Debes enviar exactShares cuando splitMethod es exact',
      };
    }
    return undefined;
  }),
);

export const QuickSplitExpenseResult = Schema.Struct({
  id: Schema.String,
  quickSplitId: Schema.String,
  description: Schema.String,
  amount: Schema.Number,
  currency: Schema.String,
  paidByParticipantId: Schema.String,
  splitMethod: SplitMethodWithFallback,
  participants: Schema.Array(
    Schema.Struct({ participantId: Schema.String, share: Schema.Number }),
  ),
  createdAt: Schema.String,
});

export const QuickSplitSettlementInput = Schema.Struct({
  fromParticipantId: Id,
  toParticipantId: Id,
  amount: PositiveAmount,
  currency: Currency,
});

export const QuickSplitSettlementResult = Schema.Struct({
  id: Schema.String,
  expenseId: Schema.String,
  amount: Schema.Number,
  currency: Schema.String,
});

export const QuickSplitExpensesQuery = Schema.Struct({
  cursor: Schema.optionalKey(Cursor.check(Schema.isMinLength(1))),
  limit: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 })),
  ),
});

const ParticipantRef = Schema.Struct({
  id: Schema.String,
  userId: Schema.NullOr(Schema.String),
  name: Schema.String,
});

export const QuickSplitExpenseFeedItem = Schema.Struct({
  id: Schema.String,
  quickSplitId: Schema.String,
  quickSplitName: Schema.String,
  description: Schema.String,
  amount: Schema.Number,
  currency: Schema.String,
  participantCount: Schema.Int,
  paidBy: ParticipantRef,
  participants: Schema.Array(
    Schema.Struct({
      ...ParticipantRef.fields,
      image: Schema.NullOr(Schema.String),
    }),
  ),
  currentUserBalance: Schema.Number,
  createdAt: Schema.String,
});

export const QuickSplitExpensesPage = Schema.Struct({
  data: Schema.Array(QuickSplitExpenseFeedItem),
  pagination: Schema.Struct({
    limit: Schema.Int,
    total: Schema.Int,
    nextCursor: Schema.NullOr(Cursor),
  }),
});

export const QuickSplitExpenseDetail = Schema.Struct({
  id: Schema.String,
  quickSplitId: Schema.String,
  quickSplitName: Schema.String,
  description: Schema.String,
  amount: Schema.Number,
  currency: Schema.String,
  splitMethod: SplitMethodWithFallback,
  createdAt: Schema.String,
  metadata: Schema.NullOr(QuickSplitExpenseMetadata),
  paidBy: Schema.Struct({
    ...ParticipantRef.fields,
    image: Schema.NullOr(Schema.String),
  }),
  participants: Schema.Array(
    Schema.Struct({
      ...ParticipantRef.fields,
      image: Schema.NullOr(Schema.String),
      share: Schema.Number,
      role: Schema.String,
    }),
  ),
  settlements: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      from: ParticipantRef,
      to: ParticipantRef,
      amount: Schema.Number,
      currency: Schema.String,
      createdAt: Schema.String,
    }),
  ),
});

export const DeletedQuickSplitExpense = Schema.Struct({ id: Schema.String });

const ExpenseParams = { id: Schema.String, expenseId: Schema.String };

export class QuickSplitsApi extends HttpApiGroup.make('quickSplits')
  .add(
    HttpApiEndpoint.get('listExpenses', '/api/quick-splits/expenses', {
      query: QuickSplitExpensesQuery,
      success: QuickSplitExpensesPage,
    }),
  )
  .add(
    HttpApiEndpoint.post('create', '/api/quick-splits', {
      payload: CreateQuickSplit,
      success: CreatedQuickSplit.pipe(HttpApiSchema.status(201)),
      error: [QuickSplitParticipantsRequired, QuickSplitParticipantsNotFound],
    }),
  )
  .add(
    HttpApiEndpoint.post('createExpense', '/api/quick-splits/:id/expenses', {
      params: { id: Schema.String },
      payload: QuickSplitExpenseInput,
      success: QuickSplitExpenseResult.pipe(HttpApiSchema.status(201)),
      error: [
        QuickSplitNotFound,
        QuickSplitExpensePayerInvalid,
        QuickSplitExpenseSharesInvalid,
      ],
    }),
  )
  .add(
    HttpApiEndpoint.post(
      'settleDebt',
      '/api/quick-splits/:id/expenses/:expenseId/settlements',
      {
        params: ExpenseParams,
        payload: QuickSplitSettlementInput,
        success: QuickSplitSettlementResult.pipe(HttpApiSchema.status(201)),
        error: [
          QuickSplitExpenseNotFound,
          QuickSplitSettlementParticipantsInvalid,
          QuickSplitSettlementAmountInvalid,
        ],
      },
    ),
  )
  .add(
    HttpApiEndpoint.put(
      'updateExpense',
      '/api/quick-splits/:id/expenses/:expenseId',
      {
        params: ExpenseParams,
        payload: QuickSplitExpenseInput,
        success: QuickSplitExpenseResult,
        error: [
          QuickSplitExpenseNotFound,
          QuickSplitNotFound,
          QuickSplitExpensePayerInvalid,
          QuickSplitExpenseSharesInvalid,
        ],
      },
    ),
  )
  .add(
    HttpApiEndpoint.get(
      'expenseDetail',
      '/api/quick-splits/:id/expenses/:expenseId',
      {
        params: ExpenseParams,
        success: QuickSplitExpenseDetail,
        error: QuickSplitExpenseNotFound,
      },
    ),
  )
  .add(
    HttpApiEndpoint.delete(
      'deleteExpense',
      '/api/quick-splits/:id/expenses/:expenseId',
      {
        params: ExpenseParams,
        success: DeletedQuickSplitExpense,
        error: QuickSplitExpenseNotFound,
      },
    ),
  )
  .middleware(SessionAuth) {}
