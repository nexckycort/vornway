// @ts-expect-error
await Bun.build({
  entrypoints: ['./src/index.ts'],
  compile: {
    outfile: './dist/join',
  },
  minify: true,
  sourcemap: 'linked',
  bytecode: true,
});
