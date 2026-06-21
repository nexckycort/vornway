import { Layer } from 'effect';
import { db } from './connection';
import { Database } from './context';

export const DatabaseLive = Layer.succeed(Database, db);
