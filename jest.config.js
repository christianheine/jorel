/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@openrouter/sdk$": "<rootDir>/src/__mocks__/@openrouter/sdk.ts",
    "^@openrouter/sdk/(.*)$": "<rootDir>/src/__mocks__/@openrouter/sdk.ts",
    "^file-type$": "<rootDir>/node_modules/file-type/index.js",
  },
  // Transform uuid and file-type since they are ESM-only modules
  transformIgnorePatterns: [
    "node_modules/(?!(uuid|file-type|strtok3|token-types|peek-readable|@tokenizer|@borewit|uint8array-extras)/)",
  ],
  transform: {
    // Use ts-jest to process ts, tsx, js, jsx files
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          allowJs: true,
        },
      },
    ],
  },
};
