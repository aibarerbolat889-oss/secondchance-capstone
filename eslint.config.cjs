const js = require('@eslint/js');
const globals = require('globals');
module.exports = [
  { ignores: ['**/node_modules/**', '**/dist/**', 'secondChance-frontend/**', '**/logger.js', '.eslintrc.js'] },
  js.configs.recommended,
  { languageOptions: { sourceType: 'commonjs', globals: globals.node }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }] } }
];
