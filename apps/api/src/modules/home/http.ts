import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { Home } from './service';

export const HomeHandlers = HttpApiBuilder.group(Api, 'home', (handlers) =>
  Effect.gen(function* () {
    const home = yield* Home;
    return handlers.handle('summary', () =>
      Effect.flatMap(CurrentUser, (user) => home.summary(user.id)),
    );
  }),
).pipe(Layer.provide(Home.layer));
