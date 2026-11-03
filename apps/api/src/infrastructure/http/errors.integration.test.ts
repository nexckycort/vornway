import { describe, expect } from 'bun:test';
import { ErrorBoundary } from '@vornway/contracts/errors';
import { Effect, Layer, Schema } from 'effect';
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
} from 'effect/http-api';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { parseJson } from '../../../testkit/json';
import { ErrorBoundaryLive } from './errors';

class FaultyApi extends HttpApiGroup.make('faulty').add(
  HttpApiEndpoint.get('boom', '/api/test/boom', { success: Schema.String }),
) {}

const TestApi = HttpApi.make('TestApi')
  .add(FaultyApi)
  .middleware(ErrorBoundary);

const FaultyHandlers = HttpApiBuilder.group(TestApi, 'faulty', (handlers) =>
  Effect.succeed(
    handlers.handle('boom', () =>
      Effect.sync(() => {
        throw new Error('secret database detail');
      }),
    ),
  ),
);

const extraRoutes = HttpApiBuilder.layer(TestApi).pipe(
  Layer.provide(FaultyHandlers),
  Layer.provide(ErrorBoundaryLive),
);

describe('ErrorBoundary', () => {
  testEffect('answers a defect with an opaque 500 and a trace id', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp({ extraRoutes });

      const response = yield* app.fetch('/api/test/boom');
      const text = yield* Effect.promise(() => response.text());

      expect(response.status).toBe(500);
      expect(parseJson(text)).toEqual({
        _tag: 'InternalError',
        traceId: expect.any(String),
      });
      expect(text).not.toContain('secret database detail');
    }),
  );
});
