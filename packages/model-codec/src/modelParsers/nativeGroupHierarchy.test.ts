import { Document } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { captureNativeGroups, restoreNativeGroups } from "./nativeGroupHierarchy";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { BG3DMaterialFlags, type BG3DGeometry, type BG3DParseResult } from "./parseBG3D";

function geometry(offset: number): BG3DGeometry {
  return { type: 0, flags: 0, numMaterials: 0, layerMaterialNum: [], numPoints: 3, numTriangles: 1,
    vertices: [[offset, 0, 0], [offset + 1, 0, 0], [offset, 1, 0]], triangles: [[0, 1, 2]] };
}

describe("native model group preservation", () => {
  it("preserves unsigned native material bits while updating editable texture and blend flags", () => {
    const document = new Document();
    document.createMaterial().setExtras({ pangeaMaterialFlags: 0x80000000 + BG3DMaterialFlags.BG3D_MATERIALFLAG_TEXTURED }).setAlphaMode("BLEND");
    const result = gltfToBG3D(document);
    expect(result.materials[0]?.flags).toBe(0x80000000 + BG3DMaterialFlags.BG3D_MATERIALFLAG_ALWAYSBLEND);
  });

  it("retains mixed nested groups, leaf ordering and empty model slots after edits", () => {
    const source: BG3DParseResult = { materials: [], groups: [{ children: [
      { children: [geometry(0), { children: [geometry(10)] }] },
      { children: [] }, geometry(20), { children: [] },
    ] }] };
    const document = bg3dParsedToGLTF(source);
    const mesh = document.getRoot().listMeshes()[0];
    const position = mesh?.listPrimitives()[0]?.getAttribute("POSITION");
    position?.setArray(new Float32Array([7, 0, 0, 8, 0, 0, 7, 1, 0]));
    const restored = gltfToBG3D(document);
    expect(captureNativeGroups(restored.groups).hierarchy).toEqual(captureNativeGroups(source.groups).hierarchy);
    expect(captureNativeGroups(restored.groups).geometries[0]?.vertices?.[0]).toEqual([7, 0, 0]);
  });

  it("keeps an empty model slot when its mesh is removed and appends newly added models", () => {
    const source = [{ children: [{ children: [geometry(0)] }, { children: [] }] }];
    const hierarchy = captureNativeGroups(source).hierarchy;
    const document = new Document();
    const added = document.createMesh();
    const restored = restoreNativeGroups(hierarchy, [added], () => [geometry(50)]);
    expect(restored?.[0]?.children).toEqual([{ children: [] }, { children: [] }, { children: [geometry(50)] }]);
  });

  it("rejects invalid or excessively deep untrusted metadata without recursion overflow", () => {
    let child: unknown = { kind: "geometry", id: 0 };
    for (let depth = 0; depth < 100; depth++) child = { kind: "group", children: [child] };
    expect(restoreNativeGroups({ version: 1, groups: [child] }, [], () => [])).toBeNull();
    expect(restoreNativeGroups({ version: 1, groups: [{ kind: "group", children: [{ kind: "geometry", id: -1 }] }] }, [], () => [])).toBeNull();
  });
});
