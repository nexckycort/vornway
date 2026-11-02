import { Effect, Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import {
  Cursor,
  literalsWithFallback,
  Page,
  TrimmedString,
} from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';

export const FEEDBACK_TYPES = ['BUG', 'FEATURE_REQUEST'] as const;
export const FeedbackType = literalsWithFallback(FEEDBACK_TYPES, 'unknown');
export const FeedbackStatus = literalsWithFallback(
  ['OPEN', 'IN_REVIEW', 'PLANNED', 'DONE', 'REJECTED'],
  'unknown',
);

export const FeedbackItem = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  type: FeedbackType,
  title: Schema.String,
  description: Schema.String,
  status: FeedbackStatus,
  priority: Schema.NullOr(Schema.String),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export const FeedbackPage = Page(FeedbackItem);

export const FeedbackPageQuery = Schema.Struct({
  cursor: Schema.optionalKey(Cursor.check(Schema.isMinLength(1))),
  limit: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 })),
  ),
});

export const CreateFeedbackPayload = Schema.Struct({
  type: Schema.Literals(FEEDBACK_TYPES),
  title: TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(160)),
  description: TrimmedString.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(5000),
  ),
  priority: Schema.optionalKey(
    TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(80)),
  ),
  metadata: Schema.optionalKey(Schema.Record(Schema.String, Schema.Json)),
  images: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        dataUrl: TrimmedString.check(Schema.isMinLength(1)),
      }),
    ).check(
      Schema.makeFilter<readonly unknown[]>(
        (images) => images.length <= 5 || 'At most 5 images',
      ),
    ),
  ),
});

export const FeedbackIdParams = Schema.Struct({
  feedbackId: TrimmedString.check(Schema.isMinLength(1)),
});

export class FeedbackCreateFailed extends Schema.TaggedError<FeedbackCreateFailed>()(
  'FeedbackCreateFailed',
  {
    code: Schema.Literal('FEEDBACK_CREATE_FAILED').pipe(
      Schema.withConstructorDefault(Effect.succeed('FEEDBACK_CREATE_FAILED')),
    ),
    message: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('No se pudo crear el reporte'),
      ),
    ),
  },
  { httpApiStatus: 400 },
) {}
export class FeedbackNotFound extends Schema.TaggedError<FeedbackNotFound>()(
  'FeedbackNotFound',
  {
    code: Schema.Literal('FEEDBACK_NOT_FOUND').pipe(
      Schema.withConstructorDefault(Effect.succeed('FEEDBACK_NOT_FOUND')),
    ),
    message: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Reporte no encontrado')),
    ),
  },
  { httpApiStatus: 404 },
) {}

export class FeedbackApi extends HttpApiGroup.make('feedback')
  .add(
    HttpApiEndpoint.get('list', '/api/feedback', {
      query: FeedbackPageQuery,
      success: FeedbackPage,
    }),
  )
  .add(
    HttpApiEndpoint.post('create', '/api/feedback', {
      payload: CreateFeedbackPayload,
      success: FeedbackItem.pipe(HttpApiSchema.status(201)),
      error: FeedbackCreateFailed,
    }),
  )
  .add(
    HttpApiEndpoint.delete('delete', '/api/feedback/:feedbackId', {
      params: FeedbackIdParams,
      success: Schema.Struct({ success: Schema.Literal(true) }),
      error: FeedbackNotFound,
    }),
  )
  .middleware(SessionAuth) {}
