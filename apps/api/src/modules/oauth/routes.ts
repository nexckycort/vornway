import { Clock, Crypto, Effect, Layer, Schema } from 'effect';
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
  UrlParams,
} from 'effect/http';
import { Login } from '../login/service';
import { McpTokens } from '../mcp/token';
import { OAuthClients } from './clients';
import { AuthorizationCodes, verifyPkce } from './codes';
import { noStoreJson, OAUTH_SCOPES, publicOrigin } from './metadata';
import { type AuthorizePageProps, authorizePage } from './page';
import {
  AuthorizeForm,
  AuthorizeQuery,
  ClientRegistrationBody,
  TokenForm,
} from './schemas';

const badRequest = (error: string) =>
  HttpServerResponse.jsonUnsafe({ error }, { status: 400 });

const html = (page: string, status = 200) =>
  HttpServerResponse.text(page, {
    status,
    contentType: 'text/html; charset=utf-8',
  });

const withoutEmpty = (fields: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== ''),
  );

const queryFields = Effect.map(
  HttpServerRequest.ParsedSearchParams,
  withoutEmpty,
);
const formFields = Effect.flatMap(
  HttpServerRequest.HttpServerRequest,
  (request) =>
    Effect.map(request.urlParamsBody, (params) =>
      withoutEmpty(UrlParams.toRecord(params)),
    ),
);

const OAuthRoutesBase = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const clients = yield* OAuthClients;
    const codes = yield* AuthorizationCodes;
    const login = yield* Login;
    const tokens = yield* McpTokens;
    const crypto = yield* Crypto.Crypto;

    const pageFor = (
      client: {
        readonly client_id: string;
        readonly client_name?: string | undefined;
      },
      fields: {
        readonly redirect_uri: string;
        readonly resource?: string | undefined;
        readonly scope?: string | undefined;
        readonly state?: string | undefined;
        readonly code_challenge?: string | undefined;
        readonly code_challenge_method?: 'plain' | 'S256' | undefined;
      },
      origin: string,
      error?: string,
    ): AuthorizePageProps => ({
      clientId: client.client_id,
      clientName: client.client_name || client.client_id,
      redirectUri: fields.redirect_uri,
      resource: fields.resource || `${origin}/mcp`,
      scope: fields.scope || OAUTH_SCOPES.join(' '),
      state: fields.state,
      codeChallenge: fields.code_challenge,
      codeChallengeMethod: fields.code_challenge_method,
      error,
    });

    const register = Effect.gen(function* () {
      const body = yield* HttpServerRequest.schemaBodyJson(
        ClientRegistrationBody,
      );
      const client = yield* clients.register(body);
      if (!client)
        return noStoreJson({ error: 'invalid_client_metadata' }, 400);

      return noStoreJson(
        {
          client_id: client.client_id,
          client_id_issued_at: Math.floor(
            (yield* Clock.currentTimeMillis) / 1000,
          ),
          client_name: client.client_name,
          redirect_uris: client.redirect_uris,
          grant_types: client.grant_types ?? ['authorization_code'],
          response_types: client.response_types ?? ['code'],
          token_endpoint_auth_method:
            client.token_endpoint_auth_method ?? 'none',
        },
        201,
      );
    }).pipe(
      Effect.catchTag(['SchemaError', 'HttpServerError'], () =>
        Effect.succeed(noStoreJson({ error: 'invalid_client_metadata' }, 400)),
      ),
    );

    const authorizePageRoute = Effect.gen(function* () {
      const query = yield* Effect.flatMap(
        queryFields,
        Schema.decodeUnknownEffect(AuthorizeQuery),
      );
      const client = yield* clients.resolve(
        query.client_id,
        query.redirect_uri,
      );
      if (!client) return badRequest('invalid_client');

      const request = yield* HttpServerRequest.HttpServerRequest;
      return html(authorizePage(pageFor(client, query, publicOrigin(request))));
    }).pipe(
      Effect.catchTag('SchemaError', () =>
        Effect.succeed(badRequest('invalid_request')),
      ),
    );

    const authorize = Effect.gen(function* () {
      const form = yield* Effect.flatMap(
        formFields,
        Schema.decodeUnknownEffect(AuthorizeForm),
      );
      const client = yield* clients.resolve(form.client_id, form.redirect_uri);
      if (!client) return badRequest('invalid_client');

      const request = yield* HttpServerRequest.HttpServerRequest;
      const origin = publicOrigin(request);
      const user = yield* login
        .verifyOtp({ email: form.email, otp: form.otp })
        .pipe(Effect.result);
      if (user._tag === 'Failure') {
        const reason = user.failure;
        const message =
          reason._tag === 'OtpRejected'
            ? reason.error
            : 'No se pudo verificar el código. Inténtalo de nuevo.';
        return html(authorizePage(pageFor(client, form, origin, message)), 401);
      }

      const code = yield* codes.create({
        clientId: client.client_id,
        redirectUri: form.redirect_uri,
        scope: form.scope || OAUTH_SCOPES.join(' '),
        resource: form.resource || `${origin}/mcp`,
        codeChallenge: form.code_challenge,
        codeChallengeMethod: form.code_challenge_method,
        user: user.success,
      });
      const redirect = new URL(form.redirect_uri);
      redirect.searchParams.set('code', code);
      if (form.state) redirect.searchParams.set('state', form.state);
      return HttpServerResponse.redirect(redirect.toString(), { status: 302 });
    }).pipe(
      Effect.catchTag(['SchemaError', 'HttpServerError'], () =>
        Effect.succeed(badRequest('invalid_request')),
      ),
    );

    const token = Effect.gen(function* () {
      const form = yield* Effect.flatMap(
        formFields,
        Schema.decodeUnknownEffect(TokenForm),
      );
      const grant = yield* codes.consume(form.code);
      if (
        !grant ||
        grant.clientId !== form.client_id ||
        grant.redirectUri !== form.redirect_uri ||
        !(yield* verifyPkce(
          crypto,
          form.code_verifier,
          grant.codeChallenge,
          grant.codeChallengeMethod,
        ))
      ) {
        return noStoreJson({ error: 'invalid_grant' }, 400);
      }

      const issued = yield* tokens.issue(grant.user);
      return noStoreJson({
        access_token: issued.accessToken,
        token_type: 'Bearer',
        expires_in: issued.expiresIn,
        scope: grant.scope,
        resource: grant.resource,
      });
    }).pipe(
      Effect.catchTag(['SchemaError', 'HttpServerError'], () =>
        Effect.succeed(noStoreJson({ error: 'invalid_request' }, 400)),
      ),
    );

    yield* router.add('POST', '/oauth/register', register);
    yield* router.add('GET', '/oauth/authorize', authorizePageRoute);
    yield* router.add('POST', '/oauth/authorize', authorize);
    yield* router.add('POST', '/oauth/token', token);
  }),
);

export const OAuthRoutes = OAuthRoutesBase.pipe(
  Layer.provide([OAuthClients.layer, AuthorizationCodes.layer, Login.layer]),
  Layer.provide(McpTokens.layer),
);
