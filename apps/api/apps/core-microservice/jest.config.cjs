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
      statements: 66,
      branches: 55,
      functions: 60,
      lines: 66,
    },
  },
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/../test/setup.ts"],
};
