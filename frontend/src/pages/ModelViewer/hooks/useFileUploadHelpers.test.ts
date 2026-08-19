import { describe, expect, it } from "vitest";
import { validateUploadSelection } from "./useFileUploadHelpers";

describe("validateUploadSelection", () => {
  it("accepts embedded .gltf model uploads", () => {
    const file = new File(["{}"], "model.gltf", {
      type: "model/gltf+json",
    });

    const result = validateUploadSelection(file);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.fail(result.error);
    }
    expect(result.value.kind).toBe("gltf");
  });

  it("rejects unsupported model upload extensions", () => {
    const file = new File(["hello"], "model.obj", { type: "text/plain" });

    const result = validateUploadSelection(file);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.fail("Expected unsupported upload to fail");
    }
    expect(result.error).toContain("GLB, or glTF");
  });
});
