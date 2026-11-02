import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

const resolveEffect = (dir: string) =>
  realpathSync(Bun.resolveSync('effect', dir));

const workspaceDeps = (dir: string): string[] => {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter(
    (name) => name.startsWith('@vornway/'),
  );
};

const packageDir = (fromDir: string, name: string): string => {
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(candidate)) return realpathSync(candidate);
    if (dir === dirname(dir))
      throw new Error(`Cannot find ${name} from ${fromDir}`);
  }
};

const project = process.cwd();
const expected = resolveEffect(project);
const mismatches: string[] = [];
const seen = new Set<string>();

const visit = (fromDir: string) => {
  for (const name of workspaceDeps(fromDir)) {
    const dir = packageDir(fromDir, name);
    if (seen.has(dir)) continue;
    seen.add(dir);
    const actual = resolveEffect(dir);
    if (actual !== expected) mismatches.push(`${name} → ${actual}`);
    visit(dir);
  }
};
visit(project);

if (mismatches.length > 0) {
  console.error(
    `More than one copy of effect: schemas fail across copies.\nProject → ${expected}\n${mismatches.join('\n')}`,
  );
  process.exit(1);
}
console.log(`One copy of effect: ${expected}`);
