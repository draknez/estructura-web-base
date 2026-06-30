module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: '18.2' },
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'warn',
  },
  overrides: [
    {
      files: ['server/**/*.js', 'scripts/**/*.mjs'],
      env: { node: true, browser: false },
    },
    {
      files: ['src/**/*.{js,jsx}'],
      env: { browser: true, node: false },
    },
  ],
  ignorePatterns: ['dist', 'node_modules', 'coverage'],
};