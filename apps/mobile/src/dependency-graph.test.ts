import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = import.meta.dir;
const EXTENSIONS = ['.ts', '.tsx'];

// Metro tries `foo.<platform>.ts(x)` and `foo.native.ts(x)` before `foo.ts(x)`.
const PLATFORM_VARIANTS = {
  ios: ['.ios', '.native', ''],
  android: ['.android', '.native', ''],
  web: ['.web', ''],
} as const;

type Platform = keyof typeof PLATFORM_VARIANTS;

const PLATFORMS = Object.keys(PLATFORM_VARIANTS) as Platform[];
const PLATFORM_SUFFIXES = new Set(['ios', 'android', 'native', 'web']);

const isSourceFile = (path: string) =>
  /\.tsx?$/.test(path) && !/\.(test|d)\.tsx?$/.test(path);

// A `.web.tsx` file is not part of the iOS bundle, and vice versa.
const belongsTo = (path: string, platform: Platform) => {
  const suffix = path.match(/\.(\w+)\.tsx?$/)?.[1];
  if (!suffix || !PLATFORM_SUFFIXES.has(suffix)) return true;
  return PLATFORM_VARIANTS[platform].some((ext) => ext === `.${suffix}`);
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return isSourceFile(path) ? [path] : [];
  });

const isFile = (path: string) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

const resolveImport = (from: string, specifier: string, platform: Platform) => {
  const base = specifier.startsWith('@/')
    ? join(ROOT, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const variant of PLATFORM_VARIANTS[platform]) {
    for (const ext of EXTENSIONS) {
      for (const candidate of [
        base + variant + ext,
        join(base, `index${variant}${ext}`),
      ]) {
        if (isFile(candidate)) return candidate;
      }
    }
  }
  return isFile(base) ? base : null;
};

// `import type` and dynamic `import()` don't run at module initialization.
const staticImports = (source: string) =>
  [
    ...source.matchAll(
      /^\s*(?:import|export)(?!\s+type\b)[^'"]*?from\s+['"]([^'"]+)['"]/gm,
    ),
    ...source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
  ].map((match) => match[1]!);

const buildGraph = (platform: Platform) => {
  const files = sourceFiles(ROOT)
    .filter((file) => belongsTo(file, platform))
    .sort();
  const graph = new Map<string, string[]>();
  for (const file of files) {
    const targets = new Set<string>();
    for (const specifier of staticImports(readFileSync(file, 'utf8'))) {
      const target = resolveImport(file, specifier, platform);
      if (target && target !== file) targets.add(target);
    }
    graph.set(file, [...targets]);
  }
  return graph;
};

// Tarjan's strongly connected components: every group of 2+ files that
// reach each other is a cycle, reported once instead of once per entry point.
const findCycles = (graph: Map<string, string[]>) => {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  let counter = 0;

  const visit = (node: string) => {
    index.set(node, counter);
    low.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) continue;
      if (!index.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node)!, low.get(next)!));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node)!, index.get(next)!));
      }
    }

    if (low.get(node) !== index.get(node)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1) {
      cycles.push(
        component
          .map((file) => relative(ROOT, file).split(sep).join('/'))
          .sort(),
      );
    }
  };

  for (const node of graph.keys()) if (!index.has(node)) visit(node);
  return cycles;
};

describe('dependency graph', () => {
  test.each(PLATFORMS)(
    'has no import cycles under %s resolution',
    (platform) => {
      const graph = buildGraph(platform);
      const edges = [...graph.values()].reduce((sum, t) => sum + t.length, 0);

      // Guards against a broken resolver silently producing an empty graph.
      expect(graph.size).toBeGreaterThan(50);
      expect(edges).toBeGreaterThan(graph.size);
      expect(findCycles(graph)).toEqual([]);
    },
  );
});
