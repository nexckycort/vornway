import { Api } from '@vornway/contracts/api';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { Converter } from './service';

export const ConverterHandlers = HttpApiBuilder.group(
  Api,
  'converter',
  (handlers) =>
    Effect.gen(function* () {
      const converter = yield* Converter;
      return handlers.handle('rates', () => converter.rates());
    }),
).pipe(Layer.provide(Converter.layer));
