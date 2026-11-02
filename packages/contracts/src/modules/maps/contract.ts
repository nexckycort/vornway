import { Effect, Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';
import { TrimmedString } from '../../schema.ts';
import { isUrl } from '../../url.ts';
import { SessionAuth } from '../auth/contract.ts';

export const MapUrl = TrimmedString.check(Schema.isMaxLength(1000), isUrl);

export const MapResolution = Schema.Struct({
  originalUrl: Schema.String,
  resolvedUrl: Schema.String,
  embedUrl: Schema.NullOr(Schema.String),
});

export class GoogleMapsOnly extends Schema.TaggedError<GoogleMapsOnly>()(
  'GoogleMapsOnly',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('Solo se permiten enlaces de Google Maps'),
      ),
    ),
  },
  { httpApiStatus: 400 },
) {}

export class MapsApi extends HttpApiGroup.make('maps')
  .add(
    HttpApiEndpoint.post('resolve', '/api/maps/resolve', {
      payload: Schema.Struct({ url: MapUrl }),
      success: MapResolution,
      error: GoogleMapsOnly,
    }),
  )
  .middleware(SessionAuth) {}
