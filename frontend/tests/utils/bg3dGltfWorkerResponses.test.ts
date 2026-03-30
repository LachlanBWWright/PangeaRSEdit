import { describe, expect, it } from "vitest";
import {
  getGlbToBg3dWorkerResponse,
  getModelToGlbWorkerResponse,
  getParsedToGlbWorkerResponse,
} from "@/pages/ModelViewer/utils/bg3dGltfWorkerResponses";

describe("BG3D glTF worker response helpers", () => {
  it("accepts model-with-skeleton-to-glb for imported 3DMF models", () => {
    const result = getModelToGlbWorkerResponse(
      {
        type: "model-with-skeleton-to-glb",
        result: new ArrayBuffer(4),
      },
      "load 3DMF model",
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      return;
    }

    expect(result.value.type).toBe("model-with-skeleton-to-glb");
  });

  it("returns specific errors for unexpected response types", () => {
    const response = getGlbToBg3dWorkerResponse(
      {
        type: "bg3d-to-glb",
        result: new ArrayBuffer(4),
      },
      "convert GLB to BG3D for BG3D export",
    );

    expect(response.isErr()).toBe(true);
    if (response.isOk()) {
      return;
    }

    expect(response.error.message).toBe(
      "Failed to convert GLB to BG3D for BG3D export: unexpected worker response type bg3d-to-glb",
    );
  });

  it("passes through parsed-to-glb responses for animation-event edits", () => {
    const response = getParsedToGlbWorkerResponse(
      {
        type: "bg3d-parsed-to-glb",
        result: new ArrayBuffer(8),
        parsed: {
          groups: [],
          materials: [],
        },
      },
      "update animation events",
    );

    expect(response.isOk()).toBe(true);
    if (response.isErr()) {
      return;
    }

    expect(response.value.type).toBe("bg3d-parsed-to-glb");
    expect(response.value.result.byteLength).toBe(8);
  });
});
