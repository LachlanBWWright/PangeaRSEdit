import { describe, expect, it } from "vitest";
import type { TunnelData, TunnelItem, TunnelSectionMesh } from "@/data/tunnelParser/types";
import {
  addTunnelItem,
  addTunnelSection,
  canDeleteTunnelSection,
  createEmptySectionMesh,
  createEmptyTunnelSection,
  deleteTunnelItemAtIndex,
  deleteTunnelSection,
  duplicateTunnelSection,
  updateTunnelItemAtIndex,
} from "@/editor/tunnel/tunnelEditorState";

function item(sectionNum: number, splineIndex = 0): TunnelItem {
  return { type: 1, splineIndex, sectionNum, scale: 1, rot: { x: 0, y: 0, z: 0 }, positionOffset: { x: 0, y: 0, z: 0 }, flags: 0, parms: [0, 0, 0] };
}

function data(sectionCount = 2): TunnelData {
  return {
    header: { versionMajor: 1, versionMinor: 0, fullPipe: false, numNubs: 0, numSplinePoints: 1, numSections: sectionCount, numItems: 3 },
    aliasData: new Uint8Array(),
    nubs: [],
    tunnelTexture: { width: 0, height: 0, data: new Uint8Array() },
    waterTexture: { width: 0, height: 0, data: new Uint8Array() },
    items: [item(0), item(1), item(2)],
    splinePoints: [{ point: { x: 10, y: 20, z: 30 }, up: { x: 0, y: 1, z: 0 } }],
    sections: Array.from({ length: sectionCount }, createEmptyTunnelSection),
  };
}

describe("tunnel editor state", () => {
  it("creates independent empty meshes and sections", () => {
    const mesh = createEmptySectionMesh();
    expect(mesh).toMatchObject({ numPoints: 0, numTriangles: 0, points: [], normals: [], uvs: [], triangles: [] });
    const section = createEmptyTunnelSection();
    expect(section.tunnelMesh).not.toBe(section.waterMesh);
    expect(section.tunnelMesh.bBox).not.toBe(section.waterMesh.bBox);
  });

  it("adds, updates, and deletes items while synchronizing the header", () => {
    const source = data();
    const addedItem = item(0, 4);
    const added = addTunnelItem(source, addedItem);
    expect(added.newIndex).toBe(3);
    expect(added.data.header.numItems).toBe(4);
    expect(source.items).toHaveLength(3);
    const updated = updateTunnelItemAtIndex(added.data, 1, addedItem);
    expect(updated.items[1]).toBe(addedItem);
    expect(deleteTunnelItemAtIndex(updated, 0).header.numItems).toBe(3);
  });

  it("inserts sections at the end or after a selected section", () => {
    const source = data();
    expect(addTunnelSection(source).insertedIndex).toBe(2);
    const inserted = addTunnelSection(source, 0);
    expect(inserted.insertedIndex).toBe(1);
    expect(inserted.data.sections).toHaveLength(3);
    expect(inserted.data.header.numSections).toBe(3);
  });

  it("deletes sections and remaps items before, on, and after the removed index", () => {
    const source = data(3);
    expect(canDeleteTunnelSection(source)).toBe(true);
    expect(canDeleteTunnelSection(data(1))).toBe(false);
    const deleted = deleteTunnelSection(source, 1);
    expect(deleted.items.map((entry) => entry.sectionNum)).toEqual([0, 0, 1]);
    expect(deleted.header.numSections).toBe(2);
  });

  it("duplicates sections deeply and shifts later items", () => {
    const source = data(3);
    source.sections[1]?.tunnelMesh.points.push({ x: 1, y: 2, z: 3 });
    const result = duplicateTunnelSection(source, 1);
    expect(result?.duplicatedIndex).toBe(2);
    expect(result?.data.items.map((entry) => entry.sectionNum)).toEqual([0, 1, 3]);
    expect(result?.data.sections[2]).toEqual(source.sections[1]);
    expect(result?.data.sections[2]).not.toBe(source.sections[1]);
    expect(duplicateTunnelSection(source, 99)).toBeNull();
  });
});

export function validMesh(): TunnelSectionMesh {
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
