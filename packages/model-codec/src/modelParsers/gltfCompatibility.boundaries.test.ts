import { describe, expect, it, vi } from "vitest";
import { Document } from "@gltf-transform/core";
import { normalizeGltfAsset } from "./gltfCompatibility";

describe("typed glTF external failures", () => {
  it.each(["data:application/octet-stream;base64,%%%", "data:application/octet-stream,%ZZ"])("rejects malformed embedded resources without rejecting the normalization promise: %s", async (uri) => {
    const json = { asset: { version: "2.0" }, buffers: [{ byteLength: 3, uri }] };
    const buffer = new TextEncoder().encode(JSON.stringify(json)).buffer;
    const result = await normalizeGltfAsset("invalid.gltf", buffer);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("gltf.missing-dependency");
  });

  it("returns a typed error when a third-party scene transform rejects", async () => {
    const transform = vi.spyOn(Document.prototype, "transform").mockRejectedValue(new Error("unavailable transform"));
    const buffer = new TextEncoder().encode(JSON.stringify({ asset: { version: "2.0" } })).buffer;
    const result = await normalizeGltfAsset("empty.gltf", buffer);
    transform.mockRestore();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.message).toContain("unavailable transform");
  });
});
