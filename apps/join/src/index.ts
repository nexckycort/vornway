import { Hono } from 'hono';
import { db } from './connection';

const app = new Hono();

app.get('/:inviteCode', async (c) => {
  const inviteCode = c.req.param('inviteCode');
  const ss = await db.group.findUnique({
    select: {
      name: true,
      owner: {
        select: {
          name: true,
        },
      },
    },
    where: {
      inviteCode,
    },
  });

  return c.text(`Hello Hono! Invitation Code: ${inviteCode}`);
});

export default app;
