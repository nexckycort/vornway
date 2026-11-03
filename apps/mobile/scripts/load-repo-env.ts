import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Loads the mobile app's local env files, with shell/EAS values taking priority. */
export function loadRepoEnv(): Record<string, string | undefined> {
  const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const localEnv = readEnvFile(resolve(appDirectory, '.env'));
  const localOverrides = readEnvFile(resolve(appDirectory, '.env.local'));

  return { ...localEnv, ...localOverrides, ...process.env };
}

function readEnvFile(path: string): Record<string, string> {
  let contents: string;
  try {
    contents = readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }

  const values: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/,
    );
    if (!match) continue;

    const [, key, rawValue = ''] = match;
    const value = rawValue.trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      values[key] = value.slice(1, -1);
    } else {
      values[key] = value.replace(/\s+#.*$/, '').trim();
    }
  }
  return values;
}
