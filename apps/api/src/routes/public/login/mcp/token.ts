import { createHmac, timingSafeEqual } from 'node:crypto';

const MCP_ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

type McpTokenPayload = {
  sub: string;
  email: string;
  name: string | null;
  iat: number;
  exp: number;
};

type McpTokenUser = {
  id: string;
  email: string;
  name: string | null;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function resolveTokenSecret(): string {
  return (
    process.env.MCP_TOKEN_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    'dev-mcp-token-secret'
  );
}

function signTokenData(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function createMcpAccessToken(
  user: McpTokenUser,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  secret: string = resolveTokenSecret(),
): { accessToken: string; expiresIn: number } {
  const payload: McpTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iat: nowSeconds,
    exp: nowSeconds + MCP_ACCESS_TOKEN_TTL_SECONDS,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = signTokenData(data, secret);

  return {
    accessToken: `${data}.${signature}`,
    expiresIn: MCP_ACCESS_TOKEN_TTL_SECONDS,
  };
}

export function verifyMcpAccessToken(
  token: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  secret: string = resolveTokenSecret(),
): McpTokenUser | null {
  const [encodedHeader, encodedPayload, signature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signTokenData(data, secret);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as McpTokenPayload;

    if (payload.exp <= nowSeconds) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
