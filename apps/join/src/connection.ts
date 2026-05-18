import { PrismaPg } from '@prisma/adapter-pg';

import { DATABASE_URL } from './env';
import { PrismaClient } from './generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});

declare global {
  var __prisma: PrismaClient | undefined;
}

export const db = globalThis.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = db;
}
