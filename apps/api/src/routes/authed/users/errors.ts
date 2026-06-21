import { Data } from 'effect';
import type { ErrorMetadata } from '#/shared/errors/error-metadata';

export class UserNotFoundError
  extends Data.TaggedError('UserNotFoundError')<{
    userId: string;
  }>
  implements ErrorMetadata<404>
{
  readonly code = 'USER_NOT_FOUND';
  readonly message = 'Usuario no encontrado';
  readonly status = 404 as const;
}

export class UserImageUploadError
  extends Data.TaggedError('UserImageUploadError')<{
    cause: unknown;
  }>
  implements ErrorMetadata<400>
{
  readonly code = 'USER_IMAGE_UPLOAD_FAILED';
  readonly message = 'No se pudo subir la imagen';
  readonly status = 400 as const;
}

export class UserImageUpdateError
  extends Data.TaggedError('UserImageUpdateError')<{
    cause: unknown;
  }>
  implements ErrorMetadata<500>
{
  readonly code = 'USER_IMAGE_UPDATE_FAILED';
  readonly message = 'No se pudo actualizar la imagen del usuario';
  readonly status = 500 as const;
}
