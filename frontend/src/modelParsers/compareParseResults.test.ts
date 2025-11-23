// Compare BG3DParseResult from original vs glTF roundtrip
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseBG3D } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";

describe("Compare Parse Results", () => {
  it("should create identical BG3DParseResult from glTF roundtrip", async () => {
    const ottoPath = __dirname + "/testSkeletons/Otto.bg3d";
    const ottoBytes = readFileSync(ottoPath);

    // Parse original
    const original = await parseBG3D(ottoBytes.buffer as ArrayBuffer);
    console.log("\n===== ORIGINAL =====");
    console.log(`Materials: ${original.materials.length}`);
    console.log(`Groups: ${original.groups.length}`);
    console.log(`Textures: ${original.materials.map(m => m.textures.length)}`);

    // Convert to glTF
    const gltf = await bg3dParsedToGLTF(original);

    // Convert back
    const roundtrip = await gltfToBG3D(gltf);
    console.log("\n===== ROUNDTRIP =====");
    console.log(`Materials: ${roundtrip.materials.length}`);
    console.log(`Groups: ${roundtrip.groups.length}`);
    console.log(`Textures: ${roundtrip.materials.map(m => m.textures.length)}`);

    // Compare materials
    console.log("\n===== MATERIAL COMPARISON =====");
    for (let i = 0; i < Math.max(original.materials.length, roundtrip.materials.length); i++) {
      const origMat = original.materials[i];
      const rtMat = roundtrip.materials[i];
      if (origMat && rtMat) {
        console.log(`Material ${i}:`);
        console.log(`  Flags: ${origMat.flags} vs ${rtMat.flags}`);
        console.log(`  Textures: ${origMat.textures.length} vs ${rtMat.textures.length}`);
        if (origMat.textures.length > 0 && rtMat.textures.length > 0) {
          console.log(`  Tex buffer: ${origMat.textures[0].bufferSize} vs ${rtMat.textures[0].bufferSize}`);
        }
      } else if (origMat) {
        console.log(`Material ${i}: EXISTS in original, MISSING in roundtrip`);
      } else {
        console.log(`Material ${i}: MISSING in original, EXISTS in roundtrip (EXTRA!)`);
      }
    }

    // Compare groups
    console.log("\n===== GROUP COMPARISON =====");
    for (let i = 0; i < Math.max(original.groups.length, roundtrip.groups.length); i++) {
      const origGroup = original.groups[i];
      const rtGroup = roundtrip.groups[i];
      if (origGroup && rtGroup) {
        const origGeoms = origGroup.children ? origGroup.children.length : 0;
        const rtGeoms = rtGroup.children ? rtGroup.children.length : 0;
        console.log(`Group ${i}: ${origGeoms} geometries vs ${rtGeoms} geometries`);
      } else if (origGroup) {
        console.log(`Group ${i}: EXISTS in original, MISSING in roundtrip`);
      } else {
        console.log(`Group ${i}: MISSING in original, EXISTS in roundtrip (EXTRA!)`);
      }
    }

    // Expect same structure
    expect(roundtrip.materials.length).toBe(original.materials.length);
    expect(roundtrip.groups.length).toBe(original.groups.length);
  });
});
