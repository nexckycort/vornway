import { Effect } from 'effect';
import { HttpRouter, HttpServerResponse } from 'effect/http';
import { Storage } from '#/infrastructure/storage/storage';

const notFound = HttpServerResponse.jsonUnsafe(
  { error: 'Archivo no encontrado' },
  { status: 404 },
);

export const MediaRoutes = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const storage = yield* Storage;

    yield* router.add(
      'GET',
      '/api/media/groups/*',
      Effect.gen(function* () {
        const params = yield* HttpRouter.params;
        const path = params['*'];
        if (!path) return notFound;

        const object = yield* storage.getObject(`groups/${path}`);
        if (!object || object.bytes.byteLength === 0) return notFound;

        return HttpServerResponse.uint8Array(object.bytes, {
          contentType: object.contentType,
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        });
      }).pipe(
        Effect.catchTag('StorageError', (error) =>
          Effect.logWarning('Media lookup failed', error).pipe(
            Effect.as(notFound),
          ),
        ),
      ),
    );
  }),
);
