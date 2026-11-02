import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { Users } from './service';

export const UsersHandlers = HttpApiBuilder.group(Api, 'users', (handlers) =>
  Effect.gen(function* () {
    const users = yield* Users;
    return handlers
      .handle('search', ({ query }) =>
        Effect.flatMap(CurrentUser, (user) =>
          users.search(user.id, query.query),
        ),
      )
      .handle('username', ({ payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          users.updateUsername(user.id, payload.username),
        ),
      )
      .handle('image', ({ payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          users.updateImage(user.id, payload.dataUrl),
        ),
      );
  }),
).pipe(Layer.provide(Users.layer));
