/**
 * ESLint flat config for ESLint v9+
 * - Browser ESM for `src/`
 * - Node (CJS) for `scripts/` and `server.js`
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
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }]
    }
  },
  // Node scripts and server (CJS)
  {
    files: ["scripts/**/*.js", "server.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }]
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
