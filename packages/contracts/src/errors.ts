import { Schema } from 'effect';
import { HttpApiMiddleware } from 'effect/http-api';

export class InternalError extends Schema.TaggedError<InternalError>()(
  'InternalError',
  { traceId: Schema.String },
  { httpApiStatus: 500 },
) {}
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()(
  'InvalidRequest',
  { message: Schema.String, kind: Schema.optionalKey(Schema.String) },
  { httpApiStatus: 400 },
) {}
export class ErrorBoundary extends HttpApiMiddleware.Service<ErrorBoundary>()(
  '@vornway/contracts/errors/ErrorBoundary',
  { error: InternalError },
) {}
export class RequestValidation extends HttpApiMiddleware.Service<RequestValidation>()(
  '@vornway/contracts/errors/RequestValidation',
  { error: InvalidRequest },
) {}
