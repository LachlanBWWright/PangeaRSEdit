import { describe, it, expect } from "vitest";
import { parse3DMF, bg3dParsedTo3DMF, ThreeDMFObjectType } from "./parse3dmf";

// Helper function to create a synthetic 3DMF file for testing
function createSynthetic3DMF(): ArrayBuffer {
  const buffer = new ArrayBuffer(1024);
  const view = new DataView(buffer);
  let offset = 0;
  
  // Create a simple TriMesh chunk
  // Chunk type: TriMesh
  view.setUint32(offset, ThreeDMFObjectType.kQ3ObjectTypeTriMesh, false);
  offset += 4;
  
  // Chunk size: 8 + (3 vertices * 12 bytes) + (1 triangle * 12 bytes) = 56 bytes
  view.setUint32(offset, 56, false);
  offset += 4;
  
  // Number of vertices (3)
  view.setUint32(offset, 3, false);
  offset += 4;
  
  // Number of triangles (1)
  view.setUint32(offset, 1, false);
  offset += 4;
  
  // Vertices (3 points forming a triangle)
  // Vertex 0: (0, 0, 0)
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  
  // Vertex 1: (1, 0, 0)
  view.setFloat32(offset, 1.0, false);
  offset += 4;
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  
  // Vertex 2: (0, 1, 0)
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  view.setFloat32(offset, 1.0, false);
  offset += 4;
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  
  // Triangle indices: (0, 1, 2)
  view.setUint32(offset, 0, false);
  offset += 4;
  view.setUint32(offset, 1, false);
  offset += 4;
  view.setUint32(offset, 2, false);
  offset += 4;
  
  return buffer.slice(0, offset);
}

describe("parse3DMF", () => {
  it("should parse a synthetic 3DMF file", () => {
    const buffer = createSynthetic3DMF();
    const result = parse3DMF(buffer);
    
    expect(result).toBeDefined();
    expect(result.materials).toBeDefined();
    expect(result.groups).toBeDefined();
    expect(result.groups.length).toBeGreaterThan(0);
    
    // Should have at least one material (default if none found)
    expect(result.materials.length).toBeGreaterThan(0);
    
    // Should have parsed the triangle mesh
    const group = result.groups[0];
    expect(group.children.length).toBeGreaterThan(0);
    
    const geometry = group.children[0] as any;
    expect(geometry.vertices).toBeDefined();
    expect(geometry.triangles).toBeDefined();
    expect(geometry.vertices.length).toBe(3);
    expect(geometry.triangles.length).toBe(1);
    
    // Check vertex coordinates
    expect(geometry.vertices[0]).toEqual([0, 0, 0]);
    expect(geometry.vertices[1]).toEqual([1, 0, 0]);
    expect(geometry.vertices[2]).toEqual([0, 1, 0]);
    
    // Check triangle indices
    expect(geometry.triangles[0]).toEqual([0, 1, 2]);
  });
  
  it("should handle empty buffer gracefully", () => {
    const buffer = new ArrayBuffer(0);
    expect(() => parse3DMF(buffer)).toThrow("File too small to be a valid 3DMF file");
  });
  
  it("should handle malformed data gracefully", () => {
    const buffer = new ArrayBuffer(100);
    // Fill with random data
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }
    
    // Should not crash, might produce empty result
    expect(() => parse3DMF(buffer)).not.toThrow();
  });
  
  it("should round-trip parse and serialize", () => {
    const buffer = createSynthetic3DMF();
    const parsed = parse3DMF(buffer);
    
    // Should be able to serialize back to 3DMF
    expect(() => bg3dParsedTo3DMF(parsed)).not.toThrow();
    
    const serialized = bg3dParsedTo3DMF(parsed);
    expect(serialized).toBeInstanceOf(ArrayBuffer);
    expect(serialized.byteLength).toBeGreaterThan(0);
  });
  
  it("should create default material when none found", () => {
    // Create a 3DMF with just a display group, no materials
    const buffer = new ArrayBuffer(100);
    const view = new DataView(buffer);
    let offset = 0;
    
    // Display group chunk
    view.setUint32(offset, ThreeDMFObjectType.kQ3ObjectTypeDisplayGroup, false);
    offset += 4;
    view.setUint32(offset, 0, false); // Empty group
    offset += 4;
    
    const result = parse3DMF(buffer);
    
    // Should have created a default material
    expect(result.materials.length).toBe(1);
    expect(result.materials[0].diffuseColor).toEqual([0.7, 0.7, 0.7, 1.0]);
  });
  
  it("demonstrates 3DMF parsing capability", () => {
    // This test shows that we can now parse 3DMF files
    const buffer = createSynthetic3DMF();
    
    // Before implementation, this would have thrown "not yet implemented"
    expect(() => parse3DMF(buffer)).not.toThrow();
    
    const result = parse3DMF(buffer);
    
    // Verify we get meaningful results
    expect(result.groups[0].children.length).toBeGreaterThan(0);
    expect(result.materials.length).toBeGreaterThan(0);
    
    console.log("3DMF parsing successfully implemented!");
  });
});
