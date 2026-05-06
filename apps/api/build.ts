// @ts-expect-error
await Bun.build({
  entrypoints: ['./src/index.ts'],
  compile: {
    outfile: './dist/api',
  },
  minify: true,
  sourcemap: 'linked',
  bytecode: true,
});
