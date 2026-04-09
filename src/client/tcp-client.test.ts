import { describe, test, expect } from "bun:test";
import { createRequest } from "./tcp-client";

describe("createRequest", () => {
  test("creates a valid request with id", () => {
    const req = createRequest("node.list", { parentPath: "/project1" });
    expect(req.action).toBe("node.list");
    expect(req.params.parentPath).toBe("/project1");
    expect(req.id).toBeDefined();
    expect(typeof req.id).toBe("string");
  });

  test("serializes to single-line JSON", () => {
    const req = createRequest("info", {});
    const serialized = JSON.stringify(req);
    expect(serialized.includes("\n")).toBe(false);
  });
});
