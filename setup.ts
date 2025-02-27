// This file is used for Bun test setup
// It's preloaded before any tests are run

// You can add global test setup, mocks, and environment configuration here
import { beforeAll, afterAll } from "bun:test";

// Global beforeAll
beforeAll(() => {
  console.log("Starting Bun test suite...");
});

// Global afterAll
afterAll(() => {
  console.log("Bun test suite completed.");
});
