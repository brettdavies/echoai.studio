module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Disable warning for unused React imports
    '@typescript-eslint/no-unused-vars': ['warn', { 
      varsIgnorePattern: 'React',
      argsIgnorePattern: '^_',
    }],
    // Allow props spreading
    'react/jsx-props-no-spreading': 'off',
  },
} 