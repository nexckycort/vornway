import reactDoctor from 'eslint-plugin-react-doctor';
import base from '../../.oxlintrc.json' with { type: 'json' };

const { recommended, 'react-native': reactNative } = reactDoctor.configs;

export default {
  extends: [base],
  plugins: ['eslint', 'oxc', 'react', 'unicorn', 'typescript', 'import'],
  jsPlugins: [
    { name: 'react-doctor', specifier: 'eslint-plugin-react-doctor' },
  ],
  settings: {
    'react-doctor': {
      portedRuleMode: 'curated',
      capabilities: ['expo', 'react-native', 'react-compiler', 'reanimated'],
    },
  },
  rules: {
    ...recommended.rules,
    ...reactNative.rules,
    'eslint/no-console': 'warn',
    'import/no-cycle': ['error', { ignoreTypes: true }],
    // The React Compiler memoizes context values.
    'react/jsx-no-constructed-context-values': 'off',
    // Duplicates react-doctor/no-array-index-as-key.
    'react/no-array-index-key': 'off',
    'react/style-prop-object': ['warn', { allow: ['StatusBar'] }],
    // Hermes doesn't implement these; the unicorn rules below recommend them.
    'eslint/no-restricted-properties': [
      'error',
      ...['toSorted', 'toReversed', 'toSpliced'].map((property) => ({
        property,
        message: "Hermes doesn't implement it.",
      })),
    ],
    'unicorn/no-array-sort': 'off',
    'unicorn/no-array-reverse': 'off',
  },
  overrides: [
    {
      files: ['src/components/ui/**'],
      rules: { 'react-doctor/only-export-components': 'off' },
    },
  ],
};
