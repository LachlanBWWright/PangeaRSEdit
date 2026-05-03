/**
 * Roundtrip tests for Bugdom 2 Tunnel Parser
 *
 * These tests verify that tunnel files can be parsed and serialized
 * back to byte-perfect output.
 */

import { describe, it, expect } from "vitest";
import { parseTunnelFile } from "../../src/data/tunnelParser/parseTunnelFile";
import { serializeTunnelFile } from "../../src/data/tunnelParser/serializeTunnelFile";
import type { TunnelData, TunnelItem, TunnelSplinePoint, TunnelSection } from "../../src/data/tunnelParser/types";

/**
 * Create a minimal valid tunnel data structure for testing
 */
function createMinimalTunnelData(): TunnelData {
  const nub: TunnelSplinePoint = {
    point: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
  };

  const splinePoint: TunnelSplinePoint = {
    point: { x: 10, y: 20, z: 30 },
    up: { x: 0, y: 1, z: 0 },
  };

  const item: TunnelItem = {
    type: 1,
    splineIndex: 0,
    sectionNum: 0,
    scale: 1.0,
    rot: { x: 0, y: 0, z: 0 },
    positionOffset: { x: 0, y: 5, z: 0 },
    flags: 0,
    parms: [0, 0, 0],
  };

  const section: TunnelSection = {
    tunnelMesh: {
      bBox: {
        min: { x: -10, y: -10, z: -10 },
        max: { x: 10, y: 10, z: 10 },
        isEmpty: false,
      },
      numPoints: 3,
      numTriangles: 1,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ],
      normals: [
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: 1 },
      ],
      uvs: [
        { u: 0, v: 0 },
        { u: 1, v: 0 },
        { u: 0, v: 1 },
      ],
      triangles: [{ a: 0, b: 1, c: 2 }],
    },
    waterMesh: {
      bBox: {
        min: { x: -5, y: -1, z: -5 },
        max: { x: 5, y: 1, z: 5 },
        isEmpty: false,
      },
      numPoints: 4,
      numTriangles: 2,
      points: [
        { x: -5, y: 0, z: -5 },
        { x: 5, y: 0, z: -5 },
        { x: 5, y: 0, z: 5 },
        { x: -5, y: 0, z: 5 },
      ],
      uvs: [
        { u: 0, v: 0 },
        { u: 1, v: 0 },
        { u: 1, v: 1 },
        { u: 0, v: 1 },
      ],
      triangles: [
        { a: 0, b: 1, c: 2 },
        { a: 0, b: 2, c: 3 },
      ],
    },
  };

  // Create a small texture (4x4 RGBA)
  const textureSize = 4 * 4 * 4; // width * height * 4 channels
  const textureData = new Uint8Array(textureSize);
  for (let i = 0; i < textureSize; i += 4) {
    textureData[i] = 255; // R
    textureData[i + 1] = 128; // G
    textureData[i + 2] = 64; // B
    textureData[i + 3] = 255; // A
  }

  return {
    header: {
      versionMajor: 1,
      versionMinor: 0,
      fullPipe: false,
      numNubs: 1,
      numSplinePoints: 1,
      numSections: 1,
      numItems: 1,
    },
    nubs: [nub],
    tunnelTexture: {
      width: 4,
      height: 4,
      data: textureData,
    },
    waterTexture: {
      width: 4,
      height: 4,
      data: new Uint8Array(textureSize),
    },
    items: [item],
    splinePoints: [splinePoint],
    sections: [section],
  };
}

describe("Tunnel Parser Roundtrip Tests", () => {
  it("should serialize and parse back minimal tunnel data", () => {
    const originalData = createMinimalTunnelData();

    // Serialize
    const serializeResult = serializeTunnelFile(originalData);
    expect(serializeResult.isOk()).toBe(true);
    if (!serializeResult.isOk()) return;

    const buffer = serializeResult.value;
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Parse back
    const parseResult = parseTunnelFile(buffer);
    expect(parseResult.isOk()).toBe(true);
    if (!parseResult.isOk()) return;

    const parsedData = parseResult.value;

    // Verify header
    expect(parsedData.header.versionMajor).toBe(originalData.header.versionMajor);
    expect(parsedData.header.versionMinor).toBe(originalData.header.versionMinor);
    expect(parsedData.header.fullPipe).toBe(originalData.header.fullPipe);
    expect(parsedData.header.numNubs).toBe(originalData.header.numNubs);
    expect(parsedData.header.numSplinePoints).toBe(originalData.header.numSplinePoints);
    expect(parsedData.header.numSections).toBe(originalData.header.numSections);
    expect(parsedData.header.numItems).toBe(originalData.header.numItems);

    // Verify nubs
    expect(parsedData.nubs.length).toBe(originalData.nubs.length);
    const origNub = originalData.nubs[0];
    const parsedNub = parsedData.nubs[0];
    if (origNub && parsedNub) {
      expect(parsedNub.point.x).toBeCloseTo(origNub.point.x, 5);
      expect(parsedNub.point.y).toBeCloseTo(origNub.point.y, 5);
      expect(parsedNub.point.z).toBeCloseTo(origNub.point.z, 5);
      expect(parsedNub.up.x).toBeCloseTo(origNub.up.x, 5);
      expect(parsedNub.up.y).toBeCloseTo(origNub.up.y, 5);
      expect(parsedNub.up.z).toBeCloseTo(origNub.up.z, 5);
    }

    // Verify texture dimensions
    expect(parsedData.tunnelTexture.width).toBe(originalData.tunnelTexture.width);
    expect(parsedData.tunnelTexture.height).toBe(originalData.tunnelTexture.height);
    expect(parsedData.tunnelTexture.data.length).toBe(originalData.tunnelTexture.data.length);

    // Verify items
    expect(parsedData.items.length).toBe(originalData.items.length);
    const origItem = originalData.items[0];
    const parsedItem = parsedData.items[0];
    if (origItem && parsedItem) {
      expect(parsedItem.type).toBe(origItem.type);
      expect(parsedItem.splineIndex).toBe(origItem.splineIndex);
      expect(parsedItem.sectionNum).toBe(origItem.sectionNum);
      expect(parsedItem.scale).toBeCloseTo(origItem.scale, 5);
      expect(parsedItem.flags).toBe(origItem.flags);
    }

    // Verify spline points
    expect(parsedData.splinePoints.length).toBe(originalData.splinePoints.length);
    const origSpline = originalData.splinePoints[0];
    const parsedSpline = parsedData.splinePoints[0];
    if (origSpline && parsedSpline) {
      expect(parsedSpline.point.x).toBeCloseTo(origSpline.point.x, 5);
      expect(parsedSpline.point.y).toBeCloseTo(origSpline.point.y, 5);
      expect(parsedSpline.point.z).toBeCloseTo(origSpline.point.z, 5);
    }

    // Verify sections
    expect(parsedData.sections.length).toBe(originalData.sections.length);
    const origSection = originalData.sections[0];
    const parsedSection = parsedData.sections[0];
    if (origSection && parsedSection) {
      expect(parsedSection.tunnelMesh.numPoints).toBe(origSection.tunnelMesh.numPoints);
      expect(parsedSection.tunnelMesh.numTriangles).toBe(origSection.tunnelMesh.numTriangles);
      expect(parsedSection.waterMesh.numPoints).toBe(origSection.waterMesh.numPoints);
      expect(parsedSection.waterMesh.numTriangles).toBe(origSection.waterMesh.numTriangles);
    }
  });

  it("should produce byte-perfect output on double roundtrip", () => {
    const originalData = createMinimalTunnelData();

    // First roundtrip
    const serialize1 = serializeTunnelFile(originalData);
    expect(serialize1.isOk()).toBe(true);
    if (!serialize1.isOk()) return;

    const parse1 = parseTunnelFile(serialize1.value);
    expect(parse1.isOk()).toBe(true);
    if (!parse1.isOk()) return;

    // Second roundtrip
    const serialize2 = serializeTunnelFile(parse1.value);
    expect(serialize2.isOk()).toBe(true);
    if (!serialize2.isOk()) return;

    // Compare byte-by-byte
    const buffer1 = new Uint8Array(serialize1.value);
    const buffer2 = new Uint8Array(serialize2.value);

    expect(buffer2.length).toBe(buffer1.length);

    let diffCount = 0;
    for (let i = 0; i < buffer1.length; i++) {
      if (buffer1[i] !== buffer2[i]) {
        diffCount++;
        if (diffCount <= 5) {
          console.log(`Byte diff at offset ${i}: ${buffer1[i]} vs ${buffer2[i]}`);
        }
      }
    }

    expect(diffCount).toBe(0);
  });

  it("should handle full pipe flag correctly", () => {
    const data = createMinimalTunnelData();
    data.header.fullPipe = true;

    const serializeResult = serializeTunnelFile(data);
    expect(serializeResult.isOk()).toBe(true);
    if (!serializeResult.isOk()) return;

    const parseResult = parseTunnelFile(serializeResult.value);
    expect(parseResult.isOk()).toBe(true);
    if (!parseResult.isOk()) return;

    expect(parseResult.value.header.fullPipe).toBe(true);
  });

  it("should handle empty tunnel (no items, minimal structure)", () => {
    const data = createMinimalTunnelData();
    data.items = [];
    data.header.numItems = 0;

    const serializeResult = serializeTunnelFile(data);
    expect(serializeResult.isOk()).toBe(true);
    if (!serializeResult.isOk()) return;

    const parseResult = parseTunnelFile(serializeResult.value);
    expect(parseResult.isOk()).toBe(true);
    if (!parseResult.isOk()) return;

    expect(parseResult.value.items.length).toBe(0);
    expect(parseResult.value.header.numItems).toBe(0);
  });

  it("should preserve texture data accurately", () => {
    const data = createMinimalTunnelData();

    // Create a pattern in texture
    for (let i = 0; i < data.tunnelTexture.data.length; i++) {
      data.tunnelTexture.data[i] = i % 256;
    }

    const serializeResult = serializeTunnelFile(data);
    expect(serializeResult.isOk()).toBe(true);
    if (!serializeResult.isOk()) return;

    const parseResult = parseTunnelFile(serializeResult.value);
    expect(parseResult.isOk()).toBe(true);
    if (!parseResult.isOk()) return;

    // Verify texture data matches exactly
    const origTex = data.tunnelTexture.data;
    const parsedTex = parseResult.value.tunnelTexture.data;

    expect(parsedTex.length).toBe(origTex.length);
    for (let i = 0; i < origTex.length; i++) {
      expect(parsedTex[i]).toBe(origTex[i]);
    }
  });

  it("should handle multiple items with different types", () => {
    const data = createMinimalTunnelData();

    // Add more items with different types
    data.items = [
      {
        type: 0,
        splineIndex: 0,
        sectionNum: 0,
        scale: 1.0,
        rot: { x: 0, y: 0, z: 0 },
        positionOffset: { x: 0, y: 0, z: 0 },
        flags: 0,
        parms: [0, 0, 0],
      },
      {
        type: 1,
        splineIndex: 0,
        sectionNum: 0,
        scale: 2.0,
        rot: { x: 1.5, y: 0.5, z: 0 },
        positionOffset: { x: 10, y: 20, z: 30 },
        flags: 1,
        parms: [100, 200, 300],
      },
      {
        type: 2,
        splineIndex: 0,
        sectionNum: 0,
        scale: 0.5,
        rot: { x: 0, y: 3.14, z: 0 },
        positionOffset: { x: -5, y: -10, z: -15 },
        flags: 2,
        parms: [1, 2, 3],
      },
    ];
    data.header.numItems = 3;

    const serializeResult = serializeTunnelFile(data);
    expect(serializeResult.isOk()).toBe(true);
    if (!serializeResult.isOk()) return;

    const parseResult = parseTunnelFile(serializeResult.value);
    expect(parseResult.isOk()).toBe(true);
    if (!parseResult.isOk()) return;

    expect(parseResult.value.items.length).toBe(3);

    // Verify second item details
    const item = parseResult.value.items[1];
    if (item) {
      expect(item.type).toBe(1);
      expect(item.scale).toBeCloseTo(2.0, 5);
      expect(item.rot.x).toBeCloseTo(1.5, 5);
      expect(item.positionOffset.x).toBeCloseTo(10, 5);
      expect(item.flags).toBe(1);
      expect(item.parms[0]).toBe(100);
    }
  });

  it("should reject files that are too small", () => {
    // Create a buffer that's too small to contain the header
    const tooSmall = new ArrayBuffer(50);
    const result = parseTunnelFile(tooSmall);
    
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) {
      expect(result.error).toContain("too small");
    }
  });
});
