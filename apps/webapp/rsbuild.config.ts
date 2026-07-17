import { paraglideRspackPlugin } from '@inlang/paraglide-js';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  output: {
    manifest: {
      filename: 'asset-manifest.json',
    },
  },
  html: {
    template: './public/index.html',
  },
  tools: {
    rspack: {
      module: {
        rules: [
          {
            test: /\.(?:js|jsx|ts|tsx)$/,
            use: {
              loader: 'builtin:swc-loader',
              options: {
                detectSyntax: 'auto',
                jsc: {
                  transform: {
                    react: { runtime: 'automatic' },
                    reactCompiler: true,
                  },
                },
              },
            },
          },
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
