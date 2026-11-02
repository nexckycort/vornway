import { Effect, Layer } from 'effect';
import { HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http';
import { metadataUrls, NO_STORE, publicOrigin } from '../oauth/metadata';
import { serveMcp } from './server';
import { bearerToken, McpTokens } from './token';

const unauthorized = (origin: string, message: string) => {
  const urls = metadataUrls(origin);
  return HttpServerResponse.jsonUnsafe(
    {
      error: 'UNAUTHORIZED',
      message,
      authorization_endpoint: urls.authorizationEndpoint,
      token_endpoint: urls.tokenEndpoint,
      registration_endpoint: urls.registrationEndpoint,
      resource_metadata: urls.resourceMetadataUrl,
    },
    {
      status: 401,
      headers: {
        ...NO_STORE,
        'www-authenticate': `Bearer realm="mcp", authorization_uri="${urls.authorizationEndpoint}", token_uri="${urls.tokenEndpoint}", registration_uri="${urls.registrationEndpoint}", resource_metadata="${urls.resourceMetadataUrl}"`,
      },
    },
  );
};

const McpRoutesBase = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const tokens = yield* McpTokens;

    yield* router.add(
      '*',
      '/mcp',
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const origin = publicOrigin(request);
        const token = bearerToken(request.headers.authorization);
        if (!token) return unauthorized(origin, 'Missing bearer token');

        const user = yield* tokens.verify(token);
        if (!user) {
          return unauthorized(origin, 'Invalid or expired bearer token');
        }

        const response = yield* serveMcp(
          yield* HttpServerRequest.toWeb(request),
          user,
        );
        return HttpServerResponse.fromWeb(response);
      }).pipe(
        Effect.catchTag('McpFailure', (error) =>
          Effect.logError('MCP request failed', error.cause).pipe(
            Effect.as(
              HttpServerResponse.jsonUnsafe(
                {
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'Error interno del servidor',
                },
                { status: 500 },
              ),
            ),
          ),
        ),
      ),
    );
  }),
);

export const McpRoutes = McpRoutesBase.pipe(Layer.provide(McpTokens.layer));
