// @ts-expect-error
await Bun.build({
  entrypoints: ['./src/index.ts'],
  compile: {
    outfile: './dist/api',
  },
  minify: true,
  sourcemap: 'linked',
  bytecode: true,
  define: {
    'process.env.APP_VERSION': JSON.stringify(Bun.randomUUIDv7()),
  },
});
