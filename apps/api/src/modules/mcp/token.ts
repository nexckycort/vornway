import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Clock,
  Context,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
} from 'effect';
import { env } from '#/config/env';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type McpUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
};

const TokenPayload = Schema.Struct({
  sub: Schema.String,
  email: Schema.String,
  name: Schema.NullOr(Schema.String),
  iat: Schema.Number,
  exp: Schema.Number,
});
type TokenPayload = typeof TokenPayload.Type;
const decodePayload = Schema.decodeUnknownOption(
  Schema.fromJsonString(TokenPayload),
);

export class McpTokens extends Context.Service<
  McpTokens,
  {
    issue(
      user: McpUser,
    ): Effect.Effect<{ accessToken: string; expiresIn: number }>;
    verify(token: string): Effect.Effect<McpUser | null>;
  }
>()('vornway/mcp/McpTokens') {
  static readonly layer = Layer.effect(
    McpTokens,
    Effect.gen(function* () {
      const dedicated = yield* env.mcpTokenSecret;
      const secret = Redacted.value(
        Option.isSome(dedicated) ? dedicated.value : yield* env.authSecret,
      );
      const nowSeconds = Effect.map(Clock.currentTimeMillis, (millis) =>
        Math.floor(millis / 1000),
      );

      return McpTokens.of({
        issue: Effect.fn('McpTokens.issue')(function* (user) {
          return createMcpAccessToken(user, yield* nowSeconds, secret);
        }),
        verify: Effect.fn('McpTokens.verify')(function* (token) {
          return verifyMcpAccessToken(token, yield* nowSeconds, secret);
        }),
      });
    }),
  );
}

export const createMcpAccessToken = (
  user: McpUser,
  nowSeconds: number,
  secret: string,
) => {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_TTL_SECONDS,
  };
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;

  return {
    accessToken: `${data}.${sign(data, secret)}`,
    expiresIn: TOKEN_TTL_SECONDS,
  };
};

export const verifyMcpAccessToken = (
  token: string,
  nowSeconds: number,
  secret: string,
): McpUser | null => {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  if (!safeEqual(signature, sign(`${header}.${payload}`, secret))) return null;

  const claims = decodePayload(
    Buffer.from(payload, 'base64url').toString('utf8'),
  );
  if (Option.isNone(claims) || claims.value.exp <= nowSeconds) return null;
  return {
    id: claims.value.sub,
    email: claims.value.email,
    name: claims.value.name,
  };
};

export const bearerToken = (authorization: string | undefined) => {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
};

const encode = (value: object) =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const sign = (data: string, secret: string) =>
  createHmac('sha256', secret).update(data).digest('base64url');

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
};
