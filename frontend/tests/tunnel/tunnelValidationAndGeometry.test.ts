import { describe, expect, it } from "vitest";
import type { TunnelData, TunnelSectionMesh } from "@/data/tunnelParser/types";
import { getTunnelValidationIssues } from "@/editor/tunnel/tunnelValidation";
import {
  createTunnelMeshGeometry,
  createWaterMeshGeometry,
  getTunnelCenterFromSpline,
  getTunnelItemPosition,
} from "@/editor/tunnel/tunnelViewerGeometry";

function mesh(): TunnelSectionMesh {
  return {
    bBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 0 }, isEmpty: false },
    numPoints: 3,
    numTriangles: 1,
    points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
    normals: [{ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }],
    uvs: [{ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 0, v: 1 }],
    triangles: [{ a: 0, b: 1, c: 2 }],
  };
}

function data(): TunnelData {
  return {
    header: { versionMajor: 1, versionMinor: 0, fullPipe: false, numNubs: 0, numSplinePoints: 3, numSections: 1, numItems: 1 },
    aliasData: new Uint8Array(), nubs: [],
    tunnelTexture: { width: 0, height: 0, data: new Uint8Array() },
    waterTexture: { width: 0, height: 0, data: new Uint8Array() },
    splinePoints: [0, 1, 2].map((value) => ({ point: { x: value * 10, y: value, z: value * -2 }, up: { x: 0, y: 1, z: 0 } })),
    items: [{ type: 0, splineIndex: 1, sectionNum: 0, scale: 1, rot: { x: 0, y: 0, z: 0 }, positionOffset: { x: 0, y: 0, z: 0 }, flags: 0, parms: [0, 0, 0] }],
    sections: [{ tunnelMesh: mesh(), waterMesh: mesh() }],
  };
}

describe("tunnel validation", () => {
  it("accepts internally consistent data", () => {
    expect(getTunnelValidationIssues(data())).toEqual([]);
  });

  it("reports every header, item, mesh-count, and triangle-index problem", () => {
    const invalid = data();
    invalid.header.numSections = 2;
    invalid.header.numItems = 2;
    invalid.header.numSplinePoints = 4;
    const invalidItem = invalid.items[0];
    expect(invalidItem).toBeDefined();
    if (!invalidItem) return;
    invalid.items[0] = { ...invalidItem, splineIndex: -1, sectionNum: 3 };
    const invalidSection = invalid.sections[0];
    expect(invalidSection).toBeDefined();
    if (!invalidSection) return;
    const invalidMesh = invalidSection.tunnelMesh;
    invalidMesh.numPoints = 4;
    invalidMesh.numTriangles = 2;
    invalidMesh.uvs = [];
    invalidMesh.normals = [];
    invalidMesh.triangles = [{ a: -1, b: 1, c: 20 }];
    expect(getTunnelValidationIssues(invalid).map((issue) => issue.id)).toEqual([
      "header-section-count", "header-item-count", "header-spline-count",
      "item-0-spline-index", "item-0-section-index", "tunnel-0-point-count",
      "tunnel-0-triangle-count", "tunnel-0-uv-count", "tunnel-0-normal-count",
      "tunnel-0-tri-0",
    ]);
  });
});

describe("tunnel viewer geometry", () => {
  it("builds indexed geometry with positions, normals, and UVs", () => {
    const geometry = createTunnelMeshGeometry(mesh());
    expect(Array.from(geometry.getAttribute("position").array)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(Array.from(geometry.getAttribute("normal").array)).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    expect(Array.from(geometry.getAttribute("uv").array)).toEqual([0, 0, 1, 0, 0, 1]);
    expect(Array.from(geometry.index?.array ?? [])).toEqual([0, 1, 2]);
  });

  it("only creates water geometry when visible and nonempty", () => {
    expect(createWaterMeshGeometry(mesh(), false)).toBeNull();
    const empty = mesh();
    empty.numPoints = 0;
    expect(createWaterMeshGeometry(empty, true)).toBeNull();
    expect(createWaterMeshGeometry(mesh(), true)?.getAttribute("normal").count).toBe(3);
  });

  it("derives tunnel center and item positions from spline points", () => {
    const source = data();
    expect(getTunnelCenterFromSpline(source).toArray()).toEqual([10, 1, -2]);
    expect(getTunnelItemPosition(source, 1, { x: 2, y: 3, z: 4 })?.toArray()).toEqual([12, 4, 2]);
    expect(getTunnelItemPosition(source, 99, { x: 0, y: 0, z: 0 })).toBeNull();
    source.splinePoints = [];
    expect(getTunnelCenterFromSpline(source).toArray()).toEqual([0, 0, 0]);
  });
});
