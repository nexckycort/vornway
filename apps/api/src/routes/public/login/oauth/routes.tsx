import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';

import type { LoginOperations } from '../auth/login-operations';
import { createMcpAccessToken } from '../mcp/token';
import { registerOAuthClient, resolveOAuthClient } from './clients';
import { OAuthAuthorizePage } from './page';
import {
  authorizeFormSchema,
  authorizeQuerySchema,
  clientRegistrationSchema,
  tokenFormSchema,
} from './schemas';
import {
  consumeAuthorizationCode,
  createAuthorizationCode,
  verifyPkce,
} from './store';

const oauthScopes = ['mcp:tools'];

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

function getMcpResourceUrlForRequest(c: Context): string {
  return `${getPublicOrigin(c)}/mcp`;
}

function oauthMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    client_registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: oauthScopes,
  };
}

function setNoStoreHeaders(c: Context) {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
}

export function createOAuthRouter(loginOperations: LoginOperations): Hono {
  const oauth = new Hono();

  oauth.post(
    '/register',
    zValidator('json', clientRegistrationSchema),
    async (c) => {
      setNoStoreHeaders(c);
      const body = c.req.valid('json');
      const client = await registerOAuthClient(body);

      if (!client) {
        return c.json({ error: 'invalid_client_metadata' }, 400);
      }

      return c.json(
        {
          client_id: client.client_id,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_name: client.client_name,
          redirect_uris: client.redirect_uris,
          grant_types: client.grant_types ?? ['authorization_code'],
          response_types: client.response_types ?? ['code'],
          token_endpoint_auth_method:
            client.token_endpoint_auth_method ?? 'none',
        },
        201,
      );
    },
  );

  oauth.get('/authorize', async (c) => {
    const query = authorizeQuerySchema.parse(c.req.query());
    const client = await resolveOAuthClient(
      query.client_id,
      query.redirect_uri,
    );

    if (!client?.redirect_uris.includes(query.redirect_uri)) {
      return c.json({ error: 'invalid_client' }, 400);
    }

    const resource = query.resource || getMcpResourceUrlForRequest(c);
    const scope = query.scope || oauthScopes.join(' ');

    return c.html(
      <OAuthAuthorizePage
        clientId={client.client_id}
        clientName={client.client_name || client.client_id}
        redirectUri={query.redirect_uri}
        resource={resource}
        scope={scope}
        state={query.state}
        codeChallenge={query.code_challenge}
        codeChallengeMethod={query.code_challenge_method}
      />,
    );
  });

  oauth.post(
    '/authorize',
    zValidator('form', authorizeFormSchema),
    async (c) => {
      const form = c.req.valid('form');
      const client = await resolveOAuthClient(
        form.client_id,
        form.redirect_uri,
      );

      if (!client?.redirect_uris.includes(form.redirect_uri)) {
        return c.json({ error: 'invalid_client' }, 400);
      }

      const login = await loginOperations.verifyOtp({
        email: form.email,
        otp: form.otp,
      });

      if (!login.success) {
        return c.html(
          <OAuthAuthorizePage
            clientId={client.client_id}
            clientName={client.client_name || client.client_id}
            redirectUri={form.redirect_uri}
            resource={form.resource || getMcpResourceUrlForRequest(c)}
            scope={form.scope || oauthScopes.join(' ')}
            state={form.state}
            codeChallenge={form.code_challenge}
            codeChallengeMethod={form.code_challenge_method}
            error={login.error}
          />,
          401,
        );
      }

      const code = createAuthorizationCode({
        clientId: client.client_id,
        redirectUri: form.redirect_uri,
        scope: form.scope || oauthScopes.join(' '),
        resource: form.resource || getMcpResourceUrlForRequest(c),
        state: form.state,
        codeChallenge: form.code_challenge,
        codeChallengeMethod: form.code_challenge_method,
        user: login.user,
      });

      const redirect = new URL(form.redirect_uri);
      redirect.searchParams.set('code', code);

      if (form.state) {
        redirect.searchParams.set('state', form.state);
      }

      return c.redirect(redirect.toString(), 302);
    },
  );

  oauth.post('/token', zValidator('form', tokenFormSchema), async (c) => {
    setNoStoreHeaders(c);
    const form = c.req.valid('form');
    const record = consumeAuthorizationCode(form.code);

    if (!record) {
      return c.json({ error: 'invalid_grant' }, 400);
    }

    if (
      record.clientId !== form.client_id ||
      record.redirectUri !== form.redirect_uri
    ) {
      return c.json({ error: 'invalid_grant' }, 400);
    }

    if (
      !verifyPkce(
        form.code_verifier,
        record.codeChallenge,
        record.codeChallengeMethod,
      )
    ) {
      return c.json({ error: 'invalid_grant' }, 400);
    }

    const token = createMcpAccessToken({
      id: record.user.id,
      email: record.user.email,
      name: record.user.name,
    });

    return c.json({
      access_token: token.accessToken,
      token_type: 'Bearer',
      expires_in: token.expiresIn,
      scope: record.scope,
      resource: record.resource,
    });
  });

  oauth.get('/.well-known/oauth-authorization-server', (c) => {
    const origin = getPublicOrigin(c);
    setNoStoreHeaders(c);
    return c.json(oauthMetadata(origin));
  });
  oauth.get('/.well-known/oauth-authorization-server/oauth', (c) => {
    const origin = getPublicOrigin(c);
    setNoStoreHeaders(c);
    return c.json(oauthMetadata(origin));
  });

  return oauth;
}
