// @ts-expect-error
await Bun.build({
  entrypoints: ['./.output/server/index.mjs'],
  compile: {
    outfile: './server',
  },
  minify: true,
  sourcemap: 'linked',
  bytecode: true,
});
