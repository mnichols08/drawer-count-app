/**
 * ESLint flat config for ESLint v9+
 * - Browser ESM for `src/`
 * - Node for scripts, Netlify Functions, and tests
 * - Tests relaxed
 */

const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules",
      "dist",
      "coverage",
      ".github",
      "**/*.min.js"
    ]
  },
  // Browser code (ESM)
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser
      }
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "warn",
        {
          args: "after-used",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_"
        }
      ]
    }
  },
  // Node scripts (CJS)
  {
    files: ["scripts/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "warn",
        {
          args: "after-used",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_"
        }
      ]
    }
  },
  // Netlify Functions and ESM tests
  {
    files: ["netlify/functions/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
    }
  },
  // Tests (ESM imports)
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-unused-vars": "off"
    }
  }
];
