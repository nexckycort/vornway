import { defineConfig } from 'react-doctor/api';

export default defineConfig({
  ignore: {
    overrides: [
      {
        files: ['src/components/ui/**'],
        rules: ['react-doctor/only-export-components'],
      },
    ],
  },
});
