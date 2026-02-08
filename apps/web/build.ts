import { Glob } from 'bun';

// Embed all files from .output/public into the binary
const glob = new Glob('./.output/public/**/*');
const publicFiles = Array.from(glob.scanSync('.')).filter(
  (f) => !f.endsWith('/'),
);

await Bun.build({
  entrypoints: ['./.output/server/index.mjs', ...publicFiles],
  compile: {
    outfile: './server',
  },
  minify: true,
  sourcemap: 'linked',
  bytecode: true,
});
