import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  createMcpTokenSchema,
  sendOtpSchema,
  syncGoogleSchema,
  verifyOtpSchema,
} from '~/modules/login/auth/schemas';
import { createLoginService } from '~/modules/login/auth/service';
import { createMcpAccessToken } from '~/modules/login/mcp/token';

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

const service = createLoginService();

const login = new Hono()
  .post('/send-otp', zValidator('json', sendOtpSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await service.sendOtp(body);

    return c.json(result, otpStatus(result.code));
  })
  .post('/verify-otp', zValidator('json', verifyOtpSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await service.verifyOtp(body);

    return c.json(result, result.success ? 200 : 401);
  })
  .post('/sync-google', zValidator('json', syncGoogleSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await service.syncGoogleSession({
      headers: c.req.raw.headers,
      ...body,
    });

    return c.json(result, result.success ? 200 : 401);
  })
  .post('/mcp-token', zValidator('json', createMcpTokenSchema), async (c) => {
    const body = c.req.valid('json');

    const result = await service.verifyOtp({
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
    const user = await service.getCurrentUser(c.req.raw.headers);

    if (!user) {
      return c.json(null, 401);
    }

    return c.json(user);
  });

export default login;
