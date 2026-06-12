module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@repo/shared-types$":
      "<rootDir>/../../../../../packages/shared-types/src/index.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/../test/setup.ts"],
};
