import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';

export const UserSearchResult = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  username: Schema.NullOr(Schema.String),
  email: Schema.String,
  isCurrentUser: Schema.Boolean,
});
export const Username = Schema.String.check(
  Schema.isMinLength(3),
  Schema.isMaxLength(24),
  Schema.isPattern(/^[a-z0-9._]+$/),
);
export const UserImage = Schema.Struct({ imageUrl: Schema.String });
export const UpdatedUsername = Schema.Struct({
  id: Schema.String,
  username: Schema.NullOr(Schema.String),
});

export class UsernameAlreadyTaken extends Schema.TaggedError<UsernameAlreadyTaken>()(
  'UsernameAlreadyTaken',
  {},
  { httpApiStatus: 409 },
) {}
export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  'UserNotFound',
  {},
  { httpApiStatus: 404 },
) {}
export class UserSearchApi extends HttpApiGroup.make('users')
  .add(
    HttpApiEndpoint.get('search', '/api/users/search', {
      query: Schema.Struct({
        query: Schema.String.check(
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
        dataUrl: Schema.String.check(Schema.isMinLength(1)),
      }),
      success: UserImage,
      error: UserNotFound,
    }),
  ) {}
