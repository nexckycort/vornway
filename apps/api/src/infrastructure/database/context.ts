import { Context } from 'effect';
import type { PrismaClient } from '#/generated/prisma/client';

export class Database extends Context.Tag('Database')<
  Database,
  PrismaClient
>() {}
