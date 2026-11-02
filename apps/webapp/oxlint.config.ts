import reactDoctor from 'eslint-plugin-react-doctor';
import base from '../../.oxlintrc.json' with { type: 'json' };

export default {
  extends: [base],
  plugins: ['eslint', 'oxc', 'react', 'unicorn', 'typescript', 'import'],
  jsPlugins: [
    { name: 'react-doctor', specifier: 'eslint-plugin-react-doctor' },
  ],
  env: { browser: true },
  settings: {
    'react-doctor': {
      portedRuleMode: 'curated',
      capabilities: ['react-compiler'],
    },
  },
  rules: {
    ...reactDoctor.configs.recommended.rules,
    'eslint/no-console': 'warn',
    'import/no-cycle': ['error', { ignoreTypes: true }],
    // Paraglide keys contain dots, so messages are read as m['group.key']().
    'import/namespace': 'off',
    'import/no-unassigned-import': ['warn', { allow: ['**/*.css'] }],
    // The React Compiler memoizes context values.
    'react/jsx-no-constructed-context-values': 'off',
    // Duplicates react-doctor/no-array-index-as-key.
    'react/no-array-index-key': 'off',
  },
};
