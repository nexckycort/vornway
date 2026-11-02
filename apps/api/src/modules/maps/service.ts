import type { InternalError } from '@vornway/contracts/errors';
import {
  GoogleMapsOnly,
  type MapResolution,
} from '@vornway/contracts/modules/maps/contract';
import { Context, Effect, Layer } from 'effect';
import { HttpClient, HttpClientRequest } from 'effect/http';
import { makeInternalFailure } from '../shared/internal-failure';
import { buildGoogleMapsEmbedUrl, isGoogleMapsUrl } from './embed-url';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export class Maps extends Context.Service<
  Maps,
  {
    resolve(
      url: string,
    ): Effect.Effect<typeof MapResolution.Type, GoogleMapsOnly | InternalError>;
  }
>()('vornway/maps/Maps') {
  static readonly layer = Layer.effect(
    Maps,
    Effect.gen(function* () {
      const internalFailure = yield* makeInternalFailure;
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest(
          HttpClientRequest.setHeader('user-agent', USER_AGENT),
        ),
        HttpClient.followRedirects(),
      );

      const finalUrl = Effect.fn('Maps.finalUrl')(function* (url: string) {
        const response = yield* client.get(url);
        return response.request.url;
      });

      const resolve = Effect.fn('Maps.resolve')(function* (url: string) {
        if (!isGoogleMapsUrl(new URL(url))) return yield* new GoogleMapsOnly();

        const resolvedUrl = yield* finalUrl(url).pipe(
          Effect.timeout('5 seconds'),
          Effect.catch(internalFailure),
        );
        return {
          originalUrl: url,
          resolvedUrl,
          embedUrl: buildGoogleMapsEmbedUrl(resolvedUrl),
        };
      });

      return Maps.of({ resolve });
    }),
  );
}
