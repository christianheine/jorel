/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@openrouter/sdk$": "<rootDir>/src/__mocks__/@openrouter/sdk.ts",
    "^@openrouter/sdk/(.*)$": "<rootDir>/src/__mocks__/@openrouter/sdk.ts",
  },
};
