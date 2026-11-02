import { Context, Effect } from 'effect';
import { HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http';

export const RequestId = Context.Reference<string>('vornway/http/RequestId', {
  defaultValue: () => '',
});

export const RequestIdMiddleware = HttpRouter.middleware(
  (effect) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const incomingRequestId = request.headers['x-request-id']?.trim();
      const requestId =
        incomingRequestId && /^[A-Za-z0-9._:-]{1,128}$/.test(incomingRequestId)
          ? incomingRequestId
          : crypto.randomUUID();

      yield* Effect.annotateCurrentSpan('request.id', requestId);
      return yield* Effect.provideService(
        effect.pipe(
          Effect.annotateLogs('request.id', requestId),
          Effect.map(HttpServerResponse.setHeader('x-request-id', requestId)),
        ),
        RequestId,
        requestId,
      );
    }),
  { global: true },
);
