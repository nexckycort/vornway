import { Api } from '@vornway/contracts/api';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { Maps } from './service';

export const MapsHandlers = HttpApiBuilder.group(Api, 'maps', (handlers) =>
  Effect.gen(function* () {
    const maps = yield* Maps;
    return handlers.handle('resolve', ({ payload }) =>
      maps.resolve(payload.url),
    );
  }),
).pipe(Layer.provide(Maps.layer));
