await Bun.build({
  entrypoints: ['./src/main.ts'],
  compile: {
    outfile: './dist/api',
  },
  minify: true,
  sourcemap: 'linked',
  format: 'esm',
  define: {
    'process.env.APP_VERSION': JSON.stringify(Bun.randomUUIDv7()),
  },
});
