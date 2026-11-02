import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { Invites } from './service';

export const InvitesHandlers = HttpApiBuilder.group(
  Api,
  'invites',
  (handlers) =>
    Effect.gen(function* () {
      const invites = yield* Invites;
      return handlers
        .handle('preview', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            invites.preview(user.id, params.inviteCode),
          ),
        )
        .handle('accept', ({ params, payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            invites.accept(user, params.inviteCode, payload.memberId),
          ),
        );
    }),
).pipe(Layer.provide(Invites.layer));
