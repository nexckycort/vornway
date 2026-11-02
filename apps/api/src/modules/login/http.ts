import { Api } from '@vornway/contracts/api';
import { Effect, Layer } from 'effect';
import { HttpServerRequest } from 'effect/http';
import { HttpApiBuilder } from 'effect/http-api';
import { McpTokens } from '../mcp/token';
import { Login } from './service';

const requestHeaders = Effect.map(
  HttpServerRequest.HttpServerRequest,
  (request) => new Headers(request.headers),
);

export const LoginHandlers = HttpApiBuilder.group(Api, 'login', (handlers) =>
  Effect.gen(function* () {
    const login = yield* Login;
    return handlers
      .handle('sendOtp', ({ payload }) => login.sendOtp(payload))
      .handle('verifyOtp', ({ payload }) =>
        Effect.map(login.verifyOtp(payload), (user) => ({
          success: true as const,
          user,
        })),
      )
      .handle('syncGoogle', ({ payload }) =>
        Effect.flatMap(requestHeaders, (headers) =>
          login.syncGoogleSession(headers, payload),
        ).pipe(Effect.map((user) => ({ success: true as const, user }))),
      )
      .handle('mcpToken', ({ payload }) => login.mcpToken(payload))
      .handle('me', () => Effect.flatMap(requestHeaders, login.currentUser));
  }),
).pipe(Layer.provide(Login.layer), Layer.provide(McpTokens.layer));
