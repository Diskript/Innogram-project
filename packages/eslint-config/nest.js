import { config as baseConfig } from "./base.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use absolute path to monorepo root
const monorepoRoot = resolve(__dirname, "../../");

// Define paths to both microservice tsconfigs
const coreMicroserviceTsconfig = resolve(
  monorepoRoot,
  "apps/api/apps/core-microservice/tsconfig.json",
);
const authMicroserviceTsconfig = resolve(
  monorepoRoot,
  "apps/api/apps/auth-microservice/tsconfig.json",
);

/**
 * ESLint configuration for NestJS backend applications
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nestJsConfig = [
  ...baseConfig,
  // Configuration for core-microservice files - use tsconfig from core-microservice
  {
    files: ["apps/api/apps/core-microservice/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: coreMicroserviceTsconfig,
        tsconfigRootDir: resolve(
          monorepoRoot,
          "apps/api/apps/core-microservice",
        ),
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Configuration for auth-microservice files - use tsconfig from auth-microservice
  {
    files: ["apps/api/apps/auth-microservice/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: authMicroserviceTsconfig,
        tsconfigRootDir: resolve(
          monorepoRoot,
          "apps/api/apps/auth-microservice",
        ),
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Test files - use tsconfig.app.json if available, otherwise fallback
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "**/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default nestJsConfig;
