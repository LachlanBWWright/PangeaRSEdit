/**
 * Integration test for rsrcdump-ts package
 * Verifies that the package is correctly installed and working
 */

import { describe, it, expect } from "vitest";
import { saveToJson, loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";

describe("rsrcdump-ts Integration", () => {
  it("should export saveToJson function", () => {
    expect(saveToJson).toBeDefined();
    expect(typeof saveToJson).toBe("function");
  });

  it("should export loadBytesFromJson function", () => {
    expect(loadBytesFromJson).toBeDefined();
    expect(typeof loadBytesFromJson).toBe("function");
  });

  it("should handle empty buffer gracefully", async () => {
    const emptyBuffer = new Uint8Array(0);
    const result = await saveToJson(emptyBuffer, [], [], []);
    
    // Should return a Result type
    expect(result).toHaveProperty("ok");
  });

  it("should return error for invalid data", async () => {
    const invalidBuffer = new Uint8Array([1, 2, 3]);
    const result = await saveToJson(invalidBuffer, [], [], []);
    
    // Invalid data should result in an error
    expect(result.ok).toBe(false);
  });
});
