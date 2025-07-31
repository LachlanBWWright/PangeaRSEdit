import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D, BG3DTagType, BG3DParseResult } from "./parseBG3D";

// Helper to create synthetic BG3D data with new tags
function createBG3DWithNewTags(): ArrayBuffer {
  // Start with a very simple BG3D structure
  const buffer = new ArrayBuffer(1024); // Plenty of space
  const view = new DataView(buffer);
  let offset = 0;
  
  // Header
  const header = "BG3D";
  for (let i = 0; i < 4; i++) {
    view.setUint8(offset++, header.charCodeAt(i));
  }
  for (let i = 0; i < 16; i++) view.setUint8(offset++, 0); // padding
  
  // Material with JPEGTEXTURE
  view.setUint32(offset, BG3DTagType.MATERIALFLAGS, false);
  offset += 4;
  view.setUint32(offset, 1, false);
  offset += 4;
  
  view.setUint32(offset, BG3DTagType.MATERIALDIFFUSECOLOR, false);
  offset += 4;
  view.setFloat32(offset, 1.0, false);
  offset += 4;
  view.setFloat32(offset, 1.0, false);
  offset += 4;
  view.setFloat32(offset, 1.0, false);
  offset += 4;
  view.setFloat32(offset, 1.0, false);
  offset += 4;
  
  // JPEGTEXTURE
  view.setUint32(offset, BG3DTagType.JPEGTEXTURE, false);
  offset += 4;
  view.setUint32(offset, 64, false); // width
  offset += 4;
  view.setUint32(offset, 64, false); // height
  offset += 4;
  view.setUint32(offset, 10, false); // bufferSize
  offset += 4;
  // 5 uint32s padding
  for (let i = 0; i < 5; i++) {
    view.setUint32(offset, 0, false);
    offset += 4;
  }
  // Fake JPEG data
  const jpegData = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];
  for (let i = 0; i < jpegData.length; i++) {
    view.setUint8(offset++, jpegData[i]);
  }
  
  // Simple geometry with BOUNDINGBOX
  view.setUint32(offset, BG3DTagType.GROUPSTART, false);
  offset += 4;
  
  view.setUint32(offset, BG3DTagType.GEOMETRY, false);
  offset += 4;
  view.setUint32(offset, 0, false); // type
  offset += 4;
  view.setUint32(offset, 1, false); // numMaterials
  offset += 4;
  view.setUint32(offset, 0, false); // layerMaterialNum[0]
  offset += 4;
  view.setUint32(offset, 0, false); // layerMaterialNum[1]
  offset += 4;
  view.setUint32(offset, 0, false); // layerMaterialNum[2]
  offset += 4;
  view.setUint32(offset, 0, false); // layerMaterialNum[3]
  offset += 4;
  view.setUint32(offset, 0, false); // flags
  offset += 4;
  view.setUint32(offset, 1, false); // numPoints
  offset += 4;
  view.setUint32(offset, 0, false); // numTriangles
  offset += 4;
  // reserved[4]
  for (let i = 0; i < 4; i++) {
    view.setUint32(offset, 0, false);
    offset += 4;
  }
  
  // Vertex array
  view.setUint32(offset, BG3DTagType.VERTEXARRAY, false);
  offset += 4;
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  view.setFloat32(offset, 0.0, false);
  offset += 4;
  
  // Triangle array (empty)
  view.setUint32(offset, BG3DTagType.TRIANGLEARRAY, false);
  offset += 4;
  
  // BOUNDINGBOX
  view.setUint32(offset, BG3DTagType.BOUNDINGBOX, false);
  offset += 4;
  view.setFloat32(offset, -1.0, false); // minX
  offset += 4;
  view.setFloat32(offset, -2.0, false); // minY
  offset += 4;
  view.setFloat32(offset, -3.0, false); // minZ
  offset += 4;
  view.setFloat32(offset, 4.0, false); // maxX
  offset += 4;
  view.setFloat32(offset, 5.0, false); // maxY
  offset += 4;
  view.setFloat32(offset, 6.0, false); // maxZ
  offset += 4;
  
  view.setUint32(offset, BG3DTagType.GROUPEND, false);
  offset += 4;
  
  view.setUint32(offset, BG3DTagType.ENDFILE, false);
  offset += 4;
  
  return buffer.slice(0, offset);
}

describe("BG3D BOUNDINGBOX and JPEGTEXTURE support", () => {
  it("parses BOUNDINGBOX tag correctly", () => {
    const buffer = createBG3DWithNewTags();
    
    const parsed = parseBG3D(buffer);
    expect(parsed).toBeDefined();
    expect(parsed.groups).toHaveLength(1);
    expect(parsed.groups[0].children[0].children).toHaveLength(1);
    
    const geometry = parsed.groups[0].children[0].children[0] as any;
    expect(geometry.boundingBox).toBeDefined();
    expect(geometry.boundingBox.min).toEqual([-1, -2, -3]);
    expect(geometry.boundingBox.max).toEqual([4, 5, 6]);
  });

  it("parses JPEGTEXTURE tag correctly", () => {
    const buffer = createBG3DWithNewTags();
    
    const parsed = parseBG3D(buffer);
    expect(parsed).toBeDefined();
    expect(parsed.materials).toHaveLength(1);
    expect(parsed.materials[0].jpegTextures).toHaveLength(1);
    
    const jpegTexture = parsed.materials[0].jpegTextures[0];
    expect(jpegTexture.width).toBe(64);
    expect(jpegTexture.height).toBe(64);
    expect(jpegTexture.bufferSize).toBe(10);
    expect(jpegTexture.jpegData).toEqual(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]));
  });

  it("round-trip parsing with BOUNDINGBOX and JPEGTEXTURE", () => {
    const originalBuffer = createBG3DWithNewTags();
    
    // Parse -> Serialize -> Parse again
    const parsed1 = parseBG3D(originalBuffer);
    const serialized = bg3dParsedToBG3D(parsed1);
    const parsed2 = parseBG3D(serialized);
    
    // Verify the data survived the round trip
    expect(parsed2.materials[0].jpegTextures).toHaveLength(1);
    expect(parsed2.materials[0].jpegTextures[0].width).toBe(64);
    expect(parsed2.materials[0].jpegTextures[0].height).toBe(64);
    expect(parsed2.materials[0].jpegTextures[0].jpegData).toEqual(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]));
    
    const geometry = parsed2.groups[0].children[0].children[0] as any;
    expect(geometry.boundingBox).toBeDefined();
    expect(geometry.boundingBox.min).toEqual([-1, -2, -3]);
    expect(geometry.boundingBox.max).toEqual([4, 5, 6]);
  });

  it("handles unknown tag gracefully", () => {
    // Test that the parser throws an error for truly unknown tags (not our new ones)
    const buffer = new ArrayBuffer(100);
    const view = new DataView(buffer);
    let offset = 0;
    
    // Header
    const header = "BG3D";
    for (let i = 0; i < 4; i++) {
      view.setUint8(offset++, header.charCodeAt(i));
    }
    for (let i = 0; i < 16; i++) view.setUint8(offset++, 0);
    
    // Unknown tag 999
    view.setUint32(offset, 999, false);
    offset += 4;
    
    expect(() => parseBG3D(buffer)).toThrow("Unknown BG3D tag: 999");
  });

  it("demonstrates the improvement: BG3D files with BOUNDINGBOX and JPEGTEXTURE no longer cause parser errors", () => {
    // Before our changes, a file with these tags would cause: "Unknown BG3D tag: 12" or "Unknown BG3D tag: 13" 
    // Now they are properly parsed
    
    const buffer = createBG3DWithNewTags();
    
    // This would have thrown before our implementation
    expect(() => parseBG3D(buffer)).not.toThrow();
    
    const parsed = parseBG3D(buffer);
    
    // Verify both features work
    expect(parsed.materials[0].jpegTextures).toHaveLength(1);
    expect(parsed.groups[0].children[0].children[0]).toHaveProperty("boundingBox");
  });
});