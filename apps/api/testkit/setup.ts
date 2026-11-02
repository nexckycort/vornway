import { afterAll } from 'bun:test';
import { closeTestDatabase } from './database';

afterAll(closeTestDatabase);
