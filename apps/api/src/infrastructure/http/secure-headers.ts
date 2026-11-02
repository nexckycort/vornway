import { Effect } from 'effect';
import { HttpRouter, HttpServerResponse } from 'effect/http';

const SECURE_HEADERS = {
  'cross-origin-resource-policy': 'same-origin',
  'cross-origin-opener-policy': 'same-origin',
  'origin-agent-cluster': '?1',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=15552000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-dns-prefetch-control': 'off',
  'x-download-options': 'noopen',
  'x-frame-options': 'SAMEORIGIN',
  'x-permitted-cross-domain-policies': 'none',
  'x-xss-protection': '0',
};

export const SecureHeadersMiddleware = HttpRouter.middleware(
  (effect) => Effect.map(effect, HttpServerResponse.setHeaders(SECURE_HEADERS)),
  { global: true },
);
