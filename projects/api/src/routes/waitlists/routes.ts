import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';

const WaitlistCreateSchema = z.object({
  email: z
    .string()
    .trim()
    .max(255)
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(120).optional(),
});

const waitlists = new Hono();

waitlists.post('/', zValidator('json', WaitlistCreateSchema), async (c) => {
  const { email, name } = c.req.valid('json');

  const existing = await db.waitlist.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return c.json({ message: 'Email already in waitlist' }, 409);
  }

  const waitlist = await db.waitlist.create({
    data: {
      email,
      name,
    },
  });

  return c.json(waitlist, 201);
});

waitlists.get('/', async (c) => {
  const waitlistEntries = await db.waitlist.count({
    orderBy: { createdAt: 'desc' },
  });

  return c.json({
    count: waitlistEntries + 100,
  });
});

export default waitlists;
