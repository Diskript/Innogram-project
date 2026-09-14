module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  coverageThreshold: {
    global: {
      statements: 48,
      branches: 53,
      functions: 44,
      lines: 48,
    },
  },
  testEnvironment: "node",
  moduleNameMapper: {
    "^@repo/shared-types$":
      "<rootDir>/../../../../../packages/shared-types/src/index.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/../test/setup.ts"],
};
