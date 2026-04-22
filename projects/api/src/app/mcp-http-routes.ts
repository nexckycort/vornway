import { StreamableHTTPTransport } from '@hono/mcp';
import type { Context } from 'hono';
import { Hono } from 'hono';

import {
  extractBearerToken,
  verifyMcpAccessToken,
} from '../modules/login/mcp/token';
import { createMcpApp } from './create-mcp-app';

const oauthScopes = ['mcp:tools'];

type UserMcpSession = {
  server: ReturnType<typeof createMcpApp>;
  transport: StreamableHTTPTransport;
};

const userSessions = new Map<string, UserMcpSession>();

function setNoStoreHeaders(c: Context) {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
}

function firstHeaderValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.split(',')[0]?.trim() || undefined;
}

function getPublicOrigin(c: Context): string {
  const requestUrl = new URL(c.req.url);
  const forwardedProto = firstHeaderValue(c.req.header('x-forwarded-proto'));
  const forwardedHost = firstHeaderValue(c.req.header('x-forwarded-host'));

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return requestUrl.origin;
}

function getMetadataUrls(origin: string) {
  return {
    issuer: origin,
    authorizationEndpoint: `${origin}/oauth/authorize`,
    tokenEndpoint: `${origin}/oauth/token`,
    registrationEndpoint: `${origin}/oauth/register`,
    resourceServerUrl: `${origin}/mcp`,
    resourceMetadataUrl: `${origin}/.well-known/oauth-protected-resource`,
  };
}

function oauthAuthorizationServerMetadata(origin: string) {
  const urls = getMetadataUrls(origin);

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
    scopes_supported: oauthScopes,
  };
}

function oauthProtectedResourceMetadata(origin: string) {
  const urls = getMetadataUrls(origin);

  return {
    resource: urls.resourceServerUrl,
    authorization_servers: [urls.issuer],
    bearer_methods_supported: ['header'],
    scopes_supported: oauthScopes,
  };
}

function unauthorizedResponse(c: Context, message: string) {
  const origin = getPublicOrigin(c);
  const urls = getMetadataUrls(origin);

  c.header(
    'WWW-Authenticate',
    `Bearer realm="mcp", authorization_uri="${urls.authorizationEndpoint}", token_uri="${urls.tokenEndpoint}", registration_uri="${urls.registrationEndpoint}", resource_metadata="${urls.resourceMetadataUrl}"`,
  );
  setNoStoreHeaders(c);

  return c.json(
    {
      error: 'UNAUTHORIZED',
      message,
      authorization_endpoint: urls.authorizationEndpoint,
      token_endpoint: urls.tokenEndpoint,
      registration_endpoint: urls.registrationEndpoint,
      resource_metadata: urls.resourceMetadataUrl,
    },
    401,
  );
}

function getOrCreateUserSession(user: {
  id: string;
  email: string;
  name: string | null;
}): UserMcpSession {
  const existing = userSessions.get(user.id);
  if (existing) {
    return existing;
  }

  const server = createMcpApp({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const transport = new StreamableHTTPTransport();
  const created = { server, transport };
  userSessions.set(user.id, created);
  return created;
}

export function createMcpHttpRouter(): Hono {
  const app = new Hono();

  app.get('/.well-known/oauth-authorization-server', (c) => {
    const origin = getPublicOrigin(c);
    setNoStoreHeaders(c);
    return c.json(oauthAuthorizationServerMetadata(origin));
  });
  app.get('/.well-known/oauth-authorization-server/oauth', (c) => {
    const origin = getPublicOrigin(c);
    setNoStoreHeaders(c);
    return c.json(oauthAuthorizationServerMetadata(origin));
  });

  app.get('/.well-known/openid-configuration', (c) => {
    const origin = getPublicOrigin(c);
    setNoStoreHeaders(c);
    return c.json(oauthAuthorizationServerMetadata(origin));
  });
  app.get('/.well-known/openid-configuration/oauth', (c) => {
    const origin = getPublicOrigin(c);
    setNoStoreHeaders(c);
    return c.json(oauthAuthorizationServerMetadata(origin));
  });

  app.get('/.well-known/oauth-protected-resource', (c) => {
    const origin = getPublicOrigin(c);
    setNoStoreHeaders(c);
    return c.json(oauthProtectedResourceMetadata(origin));
  });

  app.get('/mcp/.well-known/oauth-protected-resource', (c) => {
    const origin = getPublicOrigin(c);
    setNoStoreHeaders(c);
    return c.json(oauthProtectedResourceMetadata(origin));
  });

  app.all('/mcp', async (c) => {
    const token = extractBearerToken(c.req.header('authorization'));

    if (!token) {
      return unauthorizedResponse(c, 'Missing bearer token');
    }

    const user = verifyMcpAccessToken(token);

    if (!user) {
      return unauthorizedResponse(c, 'Invalid or expired bearer token');
    }

    const session = getOrCreateUserSession(user);

    if (!session.server.isConnected()) {
      await session.server.connect(session.transport);
    }

    return session.transport.handleRequest(c);
  });

  return app;
}
