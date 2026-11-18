const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*-test.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: globals.jest,
    },
  },
]);
