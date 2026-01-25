import { Resend } from 'resend';

import { serverEnv } from '~/config/env.server';

export const resend = new Resend(serverEnv.RESEND_API_KEY);
