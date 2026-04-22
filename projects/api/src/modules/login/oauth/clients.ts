import { env } from '~/config/env';

export type OAuthClient = {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
};

type ParsedClients = {
  byId: Map<string, OAuthClient>;
};

let cachedClients: ParsedClients | null = null;

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

    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function resolveOAuthClient(
  clientId: string,
  redirectUri: string,
): Promise<OAuthClient | null> {
  const configured = parseConfiguredClients();
  const knownClient = configured.byId.get(clientId);

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
  };
}
