import { randomUUID } from 'node:crypto';

import { env } from '#/config/env';

export type OAuthClient = {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: 'none';
};

type ParsedClients = {
  byId: Map<string, OAuthClient>;
};

let cachedClients: ParsedClients | null = null;
const dynamicClients = new Map<string, OAuthClient>();

function parseConfiguredClients(): ParsedClients {
  if (cachedClients) {
    return cachedClients;
  }

  const byId = new Map<string, OAuthClient>();

  if (env.MCP_OAUTH_CLIENTS) {
    try {
      const raw = JSON.parse(env.MCP_OAUTH_CLIENTS) as OAuthClient[];
      for (const client of raw) {
        if (!client?.client_id || !Array.isArray(client.redirect_uris)) {
          continue;
        }
        byId.set(client.client_id, client);
      }
    } catch {
      console.error('Invalid MCP_OAUTH_CLIENTS JSON, ignoring.');
    }
  }

  cachedClients = { byId };
  return cachedClients;
}

function isSafeRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);

    if (url.protocol === 'https:') {
      return true;
    }

    if (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function registerOAuthClient(input: {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}): Promise<OAuthClient | null> {
  if (!Array.isArray(input.redirect_uris) || input.redirect_uris.length === 0) {
    return null;
  }

  if (!input.redirect_uris.every(isSafeRedirectUri)) {
    return null;
  }

  const tokenEndpointAuthMethod = input.token_endpoint_auth_method;
  if (tokenEndpointAuthMethod && tokenEndpointAuthMethod !== 'none') {
    return null;
  }

  const client: OAuthClient = {
    client_id: `mcp_${randomUUID().replace(/-/g, '')}`,
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    grant_types: input.grant_types ?? ['authorization_code'],
    response_types: input.response_types ?? ['code'],
    token_endpoint_auth_method: 'none',
  };

  dynamicClients.set(client.client_id, client);
  return client;
}

export async function resolveOAuthClient(
  clientId: string,
  redirectUri: string,
): Promise<OAuthClient | null> {
  const configured = parseConfiguredClients();
  const knownClient =
    configured.byId.get(clientId) ?? dynamicClients.get(clientId);

  if (knownClient) {
    return knownClient.redirect_uris.includes(redirectUri) ? knownClient : null;
  }

  if (!isSafeRedirectUri(redirectUri)) {
    return null;
  }

  return {
    client_id: clientId,
    client_name: clientId,
    redirect_uris: [redirectUri],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  };
}
