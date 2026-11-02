import { Effect, Schema, Struct } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import { Cursor, Page, TrimmedString } from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';

export class GoalNotFound extends Schema.TaggedError<GoalNotFound>()(
  'GoalNotFound',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Meta no encontrada')),
    ),
  },
  { httpApiStatus: 404 },
) {}
export class GoalNameRequired extends Schema.TaggedError<GoalNameRequired>()(
  'GoalNameRequired',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('El nombre de la meta es obligatorio'),
      ),
    ),
  },
  { httpApiStatus: 400 },
) {}
export class GoalAccessDenied extends Schema.TaggedError<GoalAccessDenied>()(
  'GoalAccessDenied',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('No tienes acceso a esta meta'),
      ),
    ),
  },
  { httpApiStatus: 403 },
) {}
export class GoalContributionCreateForbidden extends Schema.TaggedError<GoalContributionCreateForbidden>()(
  'GoalContributionCreateForbidden',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('Solo un admin puede registrar aportes'),
      ),
    ),
  },
  { httpApiStatus: 403 },
) {}
export class GoalContributionDeleteForbidden extends Schema.TaggedError<GoalContributionDeleteForbidden>()(
  'GoalContributionDeleteForbidden',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('Solo un admin puede eliminar aportes'),
      ),
    ),
  },
  { httpApiStatus: 403 },
) {}
export class GoalParticipantInvalid extends Schema.TaggedError<GoalParticipantInvalid>()(
  'GoalParticipantInvalid',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Participante inválido')),
    ),
  },
  { httpApiStatus: 400 },
) {}
export class GoalContributionNotFound extends Schema.TaggedError<GoalContributionNotFound>()(
  'GoalContributionNotFound',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Aporte no encontrado')),
    ),
  },
  { httpApiStatus: 404 },
) {}

const Id = Schema.String.check(Schema.isMinLength(1));
const PositiveNumber = Schema.Finite.check(Schema.isGreaterThan(0));

const GoalFields = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
  description: Schema.String.check(Schema.isMaxLength(400)),
  goalType: Schema.Literals(['trip', 'gift', 'saving', 'event', 'custom']),
  emoji: Schema.NullOr(Schema.String.check(Schema.isMaxLength(16))),
  coverImageUrl: Schema.NullOr(Schema.String.check(Schema.isMaxLength(600))),
  themeColor: Schema.NullOr(Schema.String.check(Schema.isMaxLength(32))),
  contributionMode: Schema.Literals([
    'manual',
    'monthly',
    'flexible',
    'suggested',
  ]),
  currency: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(8)),
  targetAmount: PositiveNumber,
  startDate: Schema.Date,
  endDate: Schema.Date,
  installmentCount: Schema.Int.check(Schema.isGreaterThan(0)),
  installmentAmount: PositiveNumber,
  suggestedContributionAmount: Schema.NullOr(PositiveNumber),
});

export const CreateGoalPayload = Schema.Struct({
  ...GoalFields.mapFields(
    Struct.mapPick(
      [
        'description',
        'goalType',
        'emoji',
        'coverImageUrl',
        'themeColor',
        'contributionMode',
        'installmentAmount',
        'suggestedContributionAmount',
      ],
      Schema.optionalKey,
    ),
  ).fields,
  participants: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        name: Schema.String.check(
          Schema.isMinLength(1),
          Schema.isMaxLength(120),
        ),
        userId: Schema.optionalKey(Id),
      }),
    ),
  ),
});
export const UpdateGoalPayload = GoalFields.mapFields(
  Struct.map(Schema.optionalKey),
);
export const CreateGoalContributionPayload = Schema.Struct({
  memberId: Id,
  amount: PositiveNumber,
  contributedAt: Schema.optionalKey(Schema.Date),
  notes: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(400))),
});

export const GoalsQuery = Schema.Struct({
  cursor: Schema.optionalKey(Cursor),
  limit: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 })),
  ),
  search: Schema.optionalKey(
    TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
  ),
});

const GoalSummaryFields = {
  id: Schema.String,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  goalType: Schema.String,
  emoji: Schema.NullOr(Schema.String),
  coverImageUrl: Schema.NullOr(Schema.String),
  themeColor: Schema.NullOr(Schema.String),
  contributionMode: Schema.String,
  currency: Schema.String,
  targetAmount: Schema.Number,
  savedAmount: Schema.Number,
  progress: Schema.Number,
  endDate: Schema.Date,
  createdAt: Schema.Date,
  participantCount: Schema.Int,
  daysLeft: Schema.Number,
  monthlyTarget: Schema.Number,
  perMemberMonthlyTarget: Schema.Number,
};

export const GoalListItem = Schema.Struct({
  ...GoalSummaryFields,
  group: Schema.Struct({ id: Schema.String, name: Schema.String }),
});

export const GoalDetail = Schema.Struct({
  ...GoalSummaryFields,
  startDate: Schema.Date,
  installmentCount: Schema.Int,
  installmentAmount: Schema.Number,
  suggestedContributionAmount: Schema.NullOr(Schema.Number),
  completedAt: Schema.NullOr(Schema.Date),
  updatedAt: Schema.Date,
  group: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    type: Schema.String,
    description: Schema.NullOr(Schema.String),
    inviteCode: Schema.String,
    createdAt: Schema.Date,
    updatedAt: Schema.Date,
  }),
  members: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      email: Schema.NullOr(Schema.String),
      image: Schema.NullOr(Schema.String),
      role: Schema.String,
      userId: Schema.NullOr(Schema.String),
      isCurrentUser: Schema.Boolean,
    }),
  ),
  myMembership: Schema.NullOr(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      role: Schema.String,
    }),
  ),
  contributions: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      amount: Schema.Number,
      contributedAt: Schema.Date,
      notes: Schema.NullOr(Schema.String),
      member: Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        image: Schema.NullOr(Schema.String),
        isCurrentUser: Schema.Boolean,
      }),
    }),
  ),
  stats: Schema.Struct({
    remainingAmount: Schema.Number,
    averageContribution: Schema.Number,
    projectedCompletionDate: Schema.NullOr(Schema.Date),
    currentMonthContributionTotal: Schema.Number,
    contributorsThisMonth: Schema.Int,
    pendingMembersThisMonth: Schema.Int,
  }),
  memberStats: Schema.Array(
    Schema.Struct({
      memberId: Schema.String,
      totalAmount: Schema.Number,
      contributionCount: Schema.Int,
      contributedThisMonth: Schema.Boolean,
      latestContributionAt: Schema.NullOr(Schema.Date),
    }),
  ),
});

export const GoalRef = Schema.Struct({ id: Schema.String });

const GoalParams = Schema.Struct({ id: Id });
const ContributionParams = Schema.Struct({
  id: Id,
  contributionId: Id,
});

export class GoalsApi extends HttpApiGroup.make('goals')
  .add(
    HttpApiEndpoint.get('list', '/api/goals', {
      query: GoalsQuery,
      success: Page(GoalListItem),
    }),
  )
  .add(
    HttpApiEndpoint.get('get', '/api/goals/:id', {
      params: GoalParams,
      success: GoalDetail,
      error: GoalNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.post('create', '/api/goals', {
      payload: CreateGoalPayload,
      success: GoalRef.pipe(HttpApiSchema.status(201)),
      error: GoalNameRequired,
    }),
  )
  .add(
    HttpApiEndpoint.patch('update', '/api/goals/:id', {
      params: GoalParams,
      payload: UpdateGoalPayload,
      success: GoalRef,
      error: [GoalNotFound, GoalNameRequired],
    }),
  )
  .add(
    HttpApiEndpoint.post('addContribution', '/api/goals/:id/contributions', {
      params: GoalParams,
      payload: CreateGoalContributionPayload,
      success: GoalRef.pipe(HttpApiSchema.status(201)),
      error: [
        GoalNotFound,
        GoalAccessDenied,
        GoalContributionCreateForbidden,
        GoalParticipantInvalid,
      ],
    }),
  )
  .add(
    HttpApiEndpoint.delete(
      'deleteContribution',
      '/api/goals/:id/contributions/:contributionId',
      {
        params: ContributionParams,
        success: GoalRef,
        error: [
          GoalNotFound,
          GoalAccessDenied,
          GoalContributionDeleteForbidden,
          GoalContributionNotFound,
        ],
      },
    ),
  )
  .middleware(SessionAuth) {}
