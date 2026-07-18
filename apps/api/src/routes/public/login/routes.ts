import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createLoginOperations } from '#/routes/public/login/auth/login-operations';
import {
  createMcpTokenSchema,
  sendOtpSchema,
  syncGoogleSchema,
  verifyOtpSchema,
} from '#/routes/public/login/auth/schemas';
import { createMcpAccessToken } from '#/routes/public/login/mcp/token';

function otpStatus(
  code:
    | 'OTP_SENT'
    | 'INVALID_DOMAIN'
    | 'USER_ALREADY_EXISTS'
    | 'USER_NOT_FOUND',
): 200 | 400 | 404 | 409 {
  switch (code) {
    case 'OTP_SENT':
      return 200;
    case 'INVALID_DOMAIN':
      return 400;
    case 'USER_ALREADY_EXISTS':
      return 409;
    case 'USER_NOT_FOUND':
      return 404;
  }
}

const loginOperations = createLoginOperations();

export const loginRoutes = new Hono()
  .post('/send-otp', zValidator('json', sendOtpSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await loginOperations.sendOtp(body);

    return c.json(result, otpStatus(result.code));
  })
  .post('/verify-otp', zValidator('json', verifyOtpSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await loginOperations.verifyOtp(body);

    return c.json(result, result.success ? 200 : 401);
  })
  .post('/sync-google', zValidator('json', syncGoogleSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await loginOperations.syncGoogleSession({
      headers: c.req.raw.headers,
      ...body,
    });

    return c.json(result, result.success ? 200 : 401);
  })
  .post('/mcp-token', zValidator('json', createMcpTokenSchema), async (c) => {
    const body = c.req.valid('json');

    const result = await loginOperations.verifyOtp({
      email: body.email,
      otp: body.otp,
    });

    if (!result.success) {
      return c.json(result, 401);
    }

    const token = createMcpAccessToken({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    });

    return c.json({
      tokenType: 'Bearer',
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      user: result.user,
    });
  })
  .get('/me', async (c) => {
    const user = await loginOperations.getCurrentUser(c.req.raw.headers);

    if (!user) {
      return c.json(null, 401);
    }

    return c.json(user);
  });

export default loginRoutes;
export type LoginRpc = typeof loginRoutes;
