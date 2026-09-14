import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["<rootDir>/test/**/*.test.{ts,tsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/app/", // pages/routes excluded from the gate; components + lib are in scope
    "jest.setup.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 72,
      branches: 63,
      functions: 62,
      lines: 74,
    },
  },
};

export default createJestConfig(config);
