import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createMcpAccessToken } from '../mcp/token';
import type { LoginService } from '../auth/service';
import { resolveOAuthClient } from './clients';
import { OAuthAuthorizePage } from './page';
import { authorizeFormSchema, authorizeQuerySchema, tokenFormSchema } from './schemas';
import { consumeAuthorizationCode, createAuthorizationCode, verifyPkce } from './store';

const oauthScopes = ['mcp:tools'];

function getMcpResourceUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.origin}/mcp`;
}

export function createOAuthRouter(loginService: LoginService): Hono {
  const oauth = new Hono();

  oauth.get('/authorize', async (c) => {
    const query = authorizeQuerySchema.parse(c.req.query());
    const client = await resolveOAuthClient(query.client_id, query.redirect_uri);

    if (!client || !client.redirect_uris.includes(query.redirect_uri)) {
      return c.json({ error: 'invalid_client' }, 400);
    }

    const resource = query.resource || getMcpResourceUrl(c.req.url);
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

  oauth.post('/authorize', zValidator('form', authorizeFormSchema), async (c) => {
    const form = c.req.valid('form');
    const client = await resolveOAuthClient(form.client_id, form.redirect_uri);

    if (!client || !client.redirect_uris.includes(form.redirect_uri)) {
      return c.json({ error: 'invalid_client' }, 400);
    }

    const login = await loginService.verifyOtp({
      email: form.email,
      otp: form.otp,
    });

    if (!login.success) {
      return c.html(
        <OAuthAuthorizePage
          clientId={client.client_id}
          clientName={client.client_name || client.client_id}
          redirectUri={form.redirect_uri}
          resource={form.resource || getMcpResourceUrl(c.req.url)}
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
      resource: form.resource || getMcpResourceUrl(c.req.url),
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
  });

  oauth.post('/token', zValidator('form', tokenFormSchema), async (c) => {
    const form = c.req.valid('form');
    const record = consumeAuthorizationCode(form.code);

    if (!record) {
      return c.json({ error: 'invalid_grant' }, 400);
    }

    if (record.clientId !== form.client_id || record.redirectUri !== form.redirect_uri) {
      return c.json({ error: 'invalid_grant' }, 400);
    }

    if (!verifyPkce(form.code_verifier, record.codeChallenge, record.codeChallengeMethod)) {
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
    const origin = new URL(c.req.url).origin;

    return c.json({
      issuer: `${origin}/oauth`,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256', 'plain'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: oauthScopes,
    });
  });

  return oauth;
}
