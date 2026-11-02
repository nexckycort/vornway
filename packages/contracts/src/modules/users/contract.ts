import { Effect, Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';
import { TrimmedString } from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';

export const UserSearchResult = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  username: Schema.NullOr(Schema.String),
  email: Schema.String,
  isCurrentUser: Schema.Boolean,
});
export const Username = TrimmedString.check(
  Schema.isMinLength(3),
  Schema.isMaxLength(24),
  Schema.isPattern(/^[a-z0-9._]+$/),
);
export const UserImage = Schema.Struct({
  imageUrl: Schema.NullOr(Schema.String),
});
export const UpdatedUsername = Schema.Struct({
  id: Schema.String,
  username: Schema.NullOr(Schema.String),
});

export class UsernameAlreadyTaken extends Schema.TaggedError<UsernameAlreadyTaken>()(
  'UsernameAlreadyTaken',
  {
    code: Schema.Literal('USERNAME_ALREADY_TAKEN').pipe(
      Schema.withConstructorDefault(Effect.succeed('USERNAME_ALREADY_TAKEN')),
    ),
    message: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('Ese nombre de usuario ya esta en uso'),
      ),
    ),
  },
  { httpApiStatus: 409 },
) {}
export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  'UserNotFound',
  {
    code: Schema.Literal('USER_NOT_FOUND').pipe(
      Schema.withConstructorDefault(Effect.succeed('USER_NOT_FOUND')),
    ),
    message: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Usuario no encontrado')),
    ),
  },
  { httpApiStatus: 404 },
) {}
export class UserImageRejected extends Schema.TaggedError<UserImageRejected>()(
  'UserImageRejected',
  {
    code: Schema.Literal('USER_IMAGE_UPLOAD_FAILED').pipe(
      Schema.withConstructorDefault(Effect.succeed('USER_IMAGE_UPLOAD_FAILED')),
    ),
    message: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('No se pudo subir la imagen'),
      ),
    ),
  },
  { httpApiStatus: 400 },
) {}

export class UsersApi extends HttpApiGroup.make('users')
  .add(
    HttpApiEndpoint.get('search', '/api/users/search', {
      query: Schema.Struct({
        query: TrimmedString.check(
          Schema.isMinLength(1),
          Schema.isMaxLength(120),
        ),
      }),
      success: Schema.Struct({ data: Schema.Array(UserSearchResult) }),
    }),
  )
  .add(
    HttpApiEndpoint.patch('username', '/api/users/me/username', {
      payload: Schema.Struct({ username: Username }),
      success: UpdatedUsername,
      error: [UsernameAlreadyTaken, UserNotFound],
    }),
  )
  .add(
    HttpApiEndpoint.patch('image', '/api/users/me/image', {
      payload: Schema.Struct({
        dataUrl: TrimmedString.check(Schema.isMinLength(1)),
      }),
      success: UserImage,
      error: [UserNotFound, UserImageRejected],
    }),
  )
  .middleware(SessionAuth) {}
