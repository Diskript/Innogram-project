import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["<rootDir>/test/**/*.test.{ts,tsx}"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/app/", // pages/routes excluded from the gate; components + lib are in scope
    "jest.setup.ts",
  ],
};

export default createJestConfig(config);
