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
  ...(import.meta.env.DEV && {
    server: {
      open: {
        target: 'https://app.dev.vornway.com',
      },
    },
  }),
  tools: {
    rspack: {
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
