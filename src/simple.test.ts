import { expect, test, describe } from "bun:test";
import { app } from "./app";

describe("SyncDoc API", () => {
  test("Basic app exists", () => {
    expect(app).toBeDefined();
  });
});
