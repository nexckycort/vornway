import { hc } from 'hono/client';
import type { ConverterRpc } from '#/routes/authed/converter/routes';

export type { ConverterRpc };

const converterClient = hc<ConverterRpc>('');
export type ConverterClient = typeof converterClient;

export const createConverterClient = (
  ...args: Parameters<typeof hc>
): ConverterClient => hc<ConverterRpc>(...args);
