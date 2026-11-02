import base from '../../.oxlintrc.json' with { type: 'json' };

export default {
  extends: [base],
  overrides: [
    {
      files: ['src/**'],
      rules: {
        'eslint/no-console': 'error',
        'eslint/no-restricted-globals': [
          'error',
          {
            name: 'fetch',
            message:
              'Use HttpClient from effect/http: typed errors, timeouts and spans.',
          },
        ],
        'eslint/no-restricted-properties': [
          'error',
          ...['die', 'orDie', 'orDieWith'].map((property) => ({
            object: 'Effect',
            property,
            message:
              'Model the failure as a tagged error; defects become an opaque 500.',
          })),
        ],
      },
    },
    {
      files: ['src/**/*.test.ts'],
      rules: {
        'eslint/no-restricted-globals': 'off',
        'eslint/no-restricted-properties': 'off',
      },
    },
  ],
};
