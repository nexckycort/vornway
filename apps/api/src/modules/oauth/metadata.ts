import { Effect, Option } from 'effect';
import { HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http';

export const OAUTH_SCOPES = ['mcp:tools'];

export const NO_STORE = { 'cache-control': 'no-store', pragma: 'no-cache' };

export const noStoreJson = (body: object, status = 200) =>
  HttpServerResponse.jsonUnsafe(body, { status, headers: NO_STORE });

export const publicOrigin = (request: HttpServerRequest.HttpServerRequest) => {
  const proto = firstValue(request.headers['x-forwarded-proto']);
  const host = firstValue(request.headers['x-forwarded-host']);
  if (proto && host) return `${proto}://${host}`;

  if (request.source instanceof Request)
    return new URL(request.source.url).origin;
  return Option.match(HttpServerRequest.toURL(request), {
    onSome: (url) => url.origin,
    onNone: () => 'http://localhost',
  });
};

export const metadataUrls = (origin: string) => ({
  issuer: origin,
  authorizationEndpoint: `${origin}/oauth/authorize`,
  tokenEndpoint: `${origin}/oauth/token`,
  registrationEndpoint: `${origin}/oauth/register`,
  resourceServerUrl: `${origin}/mcp`,
  resourceMetadataUrl: `${origin}/.well-known/oauth-protected-resource`,
});

const authorizationServerMetadata = (origin: string) => {
  const urls = metadataUrls(origin);
  return {
    issuer: urls.issuer,
    authorization_endpoint: urls.authorizationEndpoint,
    token_endpoint: urls.tokenEndpoint,
    registration_endpoint: urls.registrationEndpoint,
    client_registration_endpoint: urls.registrationEndpoint,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: OAUTH_SCOPES,
  };
};

const protectedResourceMetadata = (origin: string) => {
  const urls = metadataUrls(origin);
  return {
    resource: urls.resourceServerUrl,
    authorization_servers: [urls.issuer],
    bearer_methods_supported: ['header'],
    scopes_supported: OAUTH_SCOPES,
  };
};

const AUTHORIZATION_SERVER_PATHS = [
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-authorization-server/oauth',
  '/.well-known/openid-configuration',
  '/.well-known/openid-configuration/oauth',
  '/oauth/.well-known/oauth-authorization-server',
  '/oauth/.well-known/oauth-authorization-server/oauth',
] as const;
const PROTECTED_RESOURCE_PATHS = [
  '/.well-known/oauth-protected-resource',
  '/mcp/.well-known/oauth-protected-resource',
] as const;

const serveMetadata = (metadata: (origin: string) => object) =>
  Effect.map(HttpServerRequest.HttpServerRequest, (request) =>
    noStoreJson(metadata(publicOrigin(request))),
  );

export const MetadataRoutes = HttpRouter.use((router) =>
  Effect.forEach(
    [
      ...AUTHORIZATION_SERVER_PATHS.map(
        (path) => [path, authorizationServerMetadata] as const,
      ),
      ...PROTECTED_RESOURCE_PATHS.map(
        (path) => [path, protectedResourceMetadata] as const,
      ),
    ],
    ([path, metadata]) => router.add('GET', path, serveMetadata(metadata)),
    { discard: true },
  ),
);

const firstValue = (value: string | undefined) =>
  value?.split(',')[0]?.trim() || undefined;
