import { Data } from 'effect';
import type { ErrorMetadata } from '#/shared/errors/error-metadata';

export class FeedbackCreateError
  extends Data.TaggedError('FeedbackCreateError')<{
    cause: unknown;
  }>
  implements ErrorMetadata<400>
{
  readonly code = 'FEEDBACK_CREATE_FAILED';
  readonly message = 'No se pudo crear el reporte';
  readonly status = 400 as const;
}

export class FeedbackListError
  extends Data.TaggedError('FeedbackListError')<{
    cause: unknown;
  }>
  implements ErrorMetadata<500>
{
  readonly code = 'FEEDBACK_LIST_FAILED';
  readonly message = 'No se pudieron listar los reportes';
  readonly status = 500 as const;
}

export class FeedbackNotFoundError
  extends Data.TaggedError('FeedbackNotFoundError')<{
    feedbackId: string;
  }>
  implements ErrorMetadata<404>
{
  readonly code = 'FEEDBACK_NOT_FOUND';
  readonly message = 'Reporte no encontrado';
  readonly status = 404 as const;
}

export class FeedbackDeleteError
  extends Data.TaggedError('FeedbackDeleteError')<{
    cause: unknown;
  }>
  implements ErrorMetadata<400>
{
  readonly code = 'FEEDBACK_DELETE_FAILED';
  readonly message = 'No se pudo eliminar el reporte';
  readonly status = 400 as const;
}
