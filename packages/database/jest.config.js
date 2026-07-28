/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  clearMocks: true,
  // Integration tests hit a real Postgres via DATABASE_URL — run
  // sequentially (--runInBand, set at the script level) to avoid unique
  // constraint collisions between tests sharing one database.
};
