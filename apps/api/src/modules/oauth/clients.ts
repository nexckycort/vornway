import { Context, Effect, Layer, Option, Schema } from 'effect';
import { env } from '#/config/env';

export type OAuthClient = {
  readonly client_id: string;
  readonly client_name?: string | undefined;
  readonly redirect_uris: readonly string[];
  readonly grant_types?: readonly string[] | undefined;
  readonly response_types?: readonly string[] | undefined;
  readonly token_endpoint_auth_method?: 'none' | undefined;
};

export type ClientRegistration = {
  readonly client_name?: string | undefined;
  readonly redirect_uris: readonly string[];
  readonly grant_types?: readonly string[] | undefined;
  readonly response_types?: readonly string[] | undefined;
  readonly token_endpoint_auth_method?: string | undefined;
};

const ConfiguredClient = Schema.Struct({
  client_id: Schema.String.check(Schema.isMinLength(1)),
  client_name: Schema.optionalKey(Schema.String),
  redirect_uris: Schema.Array(Schema.String),
  grant_types: Schema.optionalKey(Schema.Array(Schema.String)),
  response_types: Schema.optionalKey(Schema.Array(Schema.String)),
  token_endpoint_auth_method: Schema.optionalKey(Schema.Literal('none')),
});
const decodeConfiguredList = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Array(Schema.Unknown)),
);
const decodeConfiguredClient = Schema.decodeUnknownOption(ConfiguredClient);

export class OAuthClients extends Context.Service<
  OAuthClients,
  {
    register(input: ClientRegistration): Effect.Effect<OAuthClient | null>;
    resolve(
      clientId: string,
      redirectUri: string,
    ): Effect.Effect<OAuthClient | null>;
  }
>()('vornway/oauth/OAuthClients') {
  static readonly layer = Layer.effect(
    OAuthClients,
    Effect.gen(function* () {
      const configured = yield* env.mcpOauthClients.pipe(
        Effect.flatMap((json) =>
          Option.match(json, {
            onNone: () => Effect.succeed(new Map<string, OAuthClient>()),
            onSome: parseConfiguredClients,
          }),
        ),
      );
      const dynamic = new Map<string, OAuthClient>();

      const register = Effect.fn('OAuthClients.register')(
        (input: ClientRegistration) =>
          Effect.sync(() => {
            const client = newClient(input);
            if (client) dynamic.set(client.client_id, client);
            return client;
          }),
      );

      const resolve = Effect.fn('OAuthClients.resolve')(
        (clientId: string, redirectUri: string) =>
          Effect.sync(() => {
            const known = configured.get(clientId) ?? dynamic.get(clientId);
            if (known) {
              return known.redirect_uris.includes(redirectUri) ? known : null;
            }
            return isSafeRedirectUri(redirectUri)
              ? anonymousClient(clientId, redirectUri)
              : null;
          }),
      );

      return OAuthClients.of({ register, resolve });
    }),
  );
}

const parseConfiguredClients = (json: string) =>
  Option.match(decodeConfiguredList(json), {
    onNone: () =>
      Effect.logError('Invalid MCP_OAUTH_CLIENTS JSON, ignoring.').pipe(
        Effect.as(new Map<string, OAuthClient>()),
      ),
    onSome: (entries) =>
      Effect.succeed(
        new Map(
          entries.flatMap((entry) =>
            Option.match(decodeConfiguredClient(entry), {
              onNone: () => [],
              onSome: (client) => [[client.client_id, client] as const],
            }),
          ),
        ),
      ),
  });

const isSafeRedirectUri = (redirectUri: string) => {
  if (!URL.canParse(redirectUri)) return false;

  const url = new URL(redirectUri);
  if (url.protocol === 'https:') return true;
  return (
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  );
};

const newClient = (input: ClientRegistration): OAuthClient | null => {
  if (input.redirect_uris.length === 0) return null;
  if (!input.redirect_uris.every(isSafeRedirectUri)) return null;
  const method = input.token_endpoint_auth_method;
  if (method && method !== 'none') return null;

  return {
    client_id: `mcp_${crypto.randomUUID().replaceAll('-', '')}`,
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    grant_types: input.grant_types ?? ['authorization_code'],
    response_types: input.response_types ?? ['code'],
    token_endpoint_auth_method: 'none',
  };
};

const anonymousClient = (
  clientId: string,
  redirectUri: string,
): OAuthClient => ({
  client_id: clientId,
  client_name: clientId,
  redirect_uris: [redirectUri],
  grant_types: ['authorization_code'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none',
});
