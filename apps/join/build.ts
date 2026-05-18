// @ts-expect-error
await Bun.build({
  entrypoints: ['./src/index.tsx'],
  compile: {
    outfile: './dist/join',
  },
  minify: true,
  sourcemap: 'linked',
  bytecode: true,
});
