import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { sendOtpSchema, syncGoogleSchema, verifyOtpSchema } from './schemas';
import type { LoginService } from './service';

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

export function createLoginRouter(service: LoginService): Hono {
  const router = new Hono();

  router.post('/send-otp', zValidator('json', sendOtpSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await service.sendOtp(body);

    return c.json(result, otpStatus(result.code));
  });

  router.post('/verify-otp', zValidator('json', verifyOtpSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await service.verifyOtp(body);

    return c.json(result, result.success ? 200 : 401);
  });

  router.post(
    '/sync-google',
    zValidator('json', syncGoogleSchema),
    async (c) => {
      const body = c.req.valid('json');
      const result = await service.syncGoogleSession({
        headers: c.req.raw.headers,
        ...body,
      });

      return c.json(result, result.success ? 200 : 401);
    },
  );

  router.get('/me', async (c) => {
    const user = await service.getCurrentUser(c.req.raw.headers);

    if (!user) {
      return c.json(null, 401);
    }

    return c.json(user);
  });

  return router;
}
