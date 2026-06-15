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
    'process.env.VORNWAY_APP_VERSION': '1', // JSON.stringify(Bun.randomUUIDv7()),
  },
});
