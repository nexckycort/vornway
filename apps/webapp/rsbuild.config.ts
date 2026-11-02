import { fileURLToPath } from 'node:url';
import { paraglideRspackPlugin } from '@inlang/paraglide-js';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginTailwindcss(),
  ],
  output: {
    manifest: {
      filename: 'asset-manifest.json',
    },
  },
  html: {
    template: './public/index.html',
  },
  // Injected workspace packages are copies the dev server never reloads, so build from their sources with one effect.
  resolve: {
    alias: {
      '@vornway/api-client': '../../packages/api-client/src',
      '@vornway/contracts': '../../packages/contracts/src',
    },
  },
  ...(import.meta.env.DEV && {
    server: {
      open: {
        target: 'https://app.dev.vornway.com',
      },
    },
  }),
  tools: {
    rspack: {
      resolve: {
        modules: [
          fileURLToPath(new URL('node_modules', import.meta.url)),
          'node_modules',
        ],
      },
      plugins: [
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: true,
        }),
        paraglideRspackPlugin({
          project: './project.inlang',
          outdir: './src/paraglide',
          outputStructure: import.meta.env.DEV
            ? 'locale-modules'
            : 'message-modules',
        }),
      ],
    },
  },
});
