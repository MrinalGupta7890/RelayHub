// Flat ESLint config (ESLint 8.57 flat-config-compatible entry point).
// Single root config for all workspaces at this phase — kept centralized rather
// than a separate `packages/eslint-config` package to avoid publishing/linking
// overhead for a project this size. Revisit if workspace-specific rule sets
// are needed later (documented deviation from the original folder plan).
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Domain-layer boundary rule will be added in Phase 2 once domain/
    // folders exist with real content (enforced via eslint-plugin-boundaries
    // or import/no-restricted-paths). Not added now to avoid dead config
    // referencing folders that don't exist yet.
  },
  prettierConfig,
];
