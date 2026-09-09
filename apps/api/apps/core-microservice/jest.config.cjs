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
      statements: 60,
      branches: 52,
      functions: 56,
      lines: 59,
    },
  },
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/../test/setup.ts"],
};
