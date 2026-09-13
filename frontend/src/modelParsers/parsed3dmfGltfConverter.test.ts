import { Document } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import {
  gltfToParsed3dmf,
  parsed3dmfToGLTF,
} from "./parsed3dmfGltfConverter";

describe("parsed 3DMF glTF conversion boundary", () => {
  it("round-trips the normalized native representation", () => {
    const parsedResult = gltfToParsed3dmf(new Document());

    expect(parsedResult.isOk()).toBe(true);
    if (parsedResult.isErr()) return;
    expect(parsedResult.value.materials).toHaveLength(1);
    expect(parsedResult.value.groups).toEqual([]);

    const gltfResult = parsed3dmfToGLTF(parsedResult.value);

    expect(gltfResult.isOk()).toBe(true);
    if (gltfResult.isErr()) return;
    expect(gltfResult.value.getRoot().listScenes()).toHaveLength(1);
  });
});
