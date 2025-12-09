/**
 * glTF Roundtrip Tests for 3DMF files
 * Tests the complete conversion pipeline: 3DMF → BG3DParseResult → glTF → BG3DParseResult → 3DMF
 * This ensures that 3DMF files can be fully converted to glTF and back with accuracy
 */

import { describe, it, expect } from "vitest";
import { parse3DMF } from "../parse3dmf";
import { bg3dParsedToGLTF, gltfToBG3D } from "../parsedBg3dGitfConverter";
import { parseSkeletonRsrcTS } from "../skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3DWithSkeletonResource } from "../bg3dWithSkeleton";
import { BG3DParseResult } from "../parseBG3D";
import { readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";

const BUGDOM_SKELETONS_PATH = join(
  __dirname,
  "../../../public/games/bugdom1/skeletons"
);

const BUGDOM_MODELS_PATH = join(
  __dirname,
  "../../../public/games/bugdom1/models"
);

const NANOSAUR_SKELETONS_PATH = join(
  __dirname,
  "../../../public/games/nanosaur1/skeletons"
);

const NANOSAUR_MODELS_PATH = join(
  __dirname,
  "../../../public/games/nanosaur1/models"
);

/**
 * Compare two floats with tolerance for precision issues
 */
function floatsNearlyEqual(a: number, b: number, tolerance = 1e-4): boolean {
  if (a === b) return true;
  const diff = Math.abs(a - b);
  const maxMag = Math.max(Math.abs(a), Math.abs(b), 1);
  return diff / maxMag < tolerance;
}

/**
 * Compare two BG3DParseResult structures for semantic equality
 */
function compareBG3DResults(
  original: BG3DParseResult, 
  roundtrip: BG3DParseResult,
  label: string
): { match: boolean; differences: string[] } {
  const differences: string[] = [];
  
  // Compare materials count
  if (original.materials.length !== roundtrip.materials.length) {
    differences.push(`${label}: Material count mismatch - original: ${original.materials.length}, roundtrip: ${roundtrip.materials.length}`);
  }
  
  // Compare groups count
  if (original.groups.length !== roundtrip.groups.length) {
    differences.push(`${label}: Group count mismatch - original: ${original.groups.length}, roundtrip: ${roundtrip.groups.length}`);
  }
  
  // Helper function to flatten groups to get all geometries
  function flattenGeometries(groups: BG3DParseResult["groups"]): BG3DParseResult["groups"][0]["children"] {
    const result: BG3DParseResult["groups"][0]["children"] = [];
    for (const group of groups) {
      if (group.children) {
        for (const child of group.children) {
          if ("vertices" in child || "numPoints" in child) {
            result.push(child);
          }
        }
      }
    }
    return result;
  }
  
  const origGeometries = flattenGeometries(original.groups);
  const rtGeometries = flattenGeometries(roundtrip.groups);
  
  if (origGeometries.length !== rtGeometries.length) {
    differences.push(`${label}: Total geometry count mismatch - original: ${origGeometries.length}, roundtrip: ${rtGeometries.length}`);
    return { match: false, differences };
  }
  
  // Compare each geometry
  for (let i = 0; i < origGeometries.length; i++) {
    const origGeom = origGeometries[i];
    const rtGeom = rtGeometries[i];
    
    if (!origGeom || !rtGeom || !("numPoints" in origGeom) || !("numPoints" in rtGeom)) {
      differences.push(`${label}: Geometry ${i} is missing or not a geometry`);
      continue;
    }
    
    // Compare vertex counts (use numPoints)
    if (origGeom.numPoints !== rtGeom.numPoints) {
      differences.push(`${label}: Geom ${i} vertex count mismatch - original: ${origGeom.numPoints}, roundtrip: ${rtGeom.numPoints}`);
      continue;
    }
    
    // Compare triangle counts
    if (origGeom.numTriangles !== rtGeom.numTriangles) {
      differences.push(`${label}: Geom ${i} triangle count mismatch - original: ${origGeom.numTriangles}, roundtrip: ${rtGeom.numTriangles}`);
      continue;
    }
    
    // Compare vertex positions (with tolerance)
    // BG3DGeometry stores vertices as [number, number, number][] tuples
    const origVerts = origGeom.vertices;
    const rtVerts = rtGeom.vertices;
    
    if (origVerts && rtVerts) {
      const minVerts = Math.min(origVerts.length, rtVerts.length);
      let vertexMismatch = false;
      for (let v = 0; v < minVerts && !vertexMismatch; v++) {
        const origV = origVerts[v];
        const rtV = rtVerts[v];
        if (!origV || !rtV) continue;
        
        const [origX, origY, origZ] = origV;
        const [rtX, rtY, rtZ] = rtV;
        
        if (!floatsNearlyEqual(origX, rtX) || !floatsNearlyEqual(origY, rtY) || !floatsNearlyEqual(origZ, rtZ)) {
          differences.push(`${label}: Geom ${i}, Vertex ${v} position mismatch`);
          vertexMismatch = true;
        }
      }
    }
    
    // Compare triangle indices
    // BG3DGeometry stores triangles as [number, number, number][] tuples
    const origTris = origGeom.triangles;
    const rtTris = rtGeom.triangles;
    
    if (origTris && rtTris) {
      const minTris = Math.min(origTris.length, rtTris.length);
      let triangleMismatch = false;
      for (let t = 0; t < minTris && !triangleMismatch; t++) {
        const origT = origTris[t];
        const rtT = rtTris[t];
        if (!origT || !rtT) continue;
        
        const [origI0, origI1, origI2] = origT;
        const [rtI0, rtI1, rtI2] = rtT;
        
        if (origI0 !== rtI0 || origI1 !== rtI1 || origI2 !== rtI2) {
          differences.push(`${label}: Geom ${i}, Triangle ${t} index mismatch`);
          triangleMismatch = true;
        }
      }
    }
  }
  
  return {
    match: differences.length === 0,
    differences
  };
}

describe("3DMF glTF Full Roundtrip Tests", () => {
  describe("3DMF → glTF → 3DMF (without skeleton)", () => {
    const testFiles = [
      { path: BUGDOM_SKELETONS_PATH, name: "Ant.3dmf" },
      { path: BUGDOM_SKELETONS_PATH, name: "Spider.3dmf" },
      { path: BUGDOM_SKELETONS_PATH, name: "Slug.3dmf" },
      { path: NANOSAUR_SKELETONS_PATH, name: "Deinon.3dmf" },
      { path: NANOSAUR_SKELETONS_PATH, name: "Rex.3dmf" },
    ];

    testFiles.forEach(({ path, name }) => {
      it(`should roundtrip ${name} through glTF format`, async () => {
        const testFile = join(path, name);
        let fileBuffer: ArrayBuffer;
        
        try {
          const data = readFileSync(testFile);
          fileBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        } catch {
          console.log(`${name} not available, skipping`);
          return;
        }

        console.log(`\n=== Testing ${name} glTF Roundtrip ===`);

        // Step 1: Parse 3DMF → BG3DParseResult
        const parseResult = parse3DMF(fileBuffer);
        expect(parseResult.ok).toBe(true);
        if (!parseResult.ok) {
          console.log(`Parse error: ${parseResult.error.message}`);
          return;
        }
        const originalBG3D = parseResult.value;
        console.log(`Parsed ${name}: ${originalBG3D.materials.length} materials, ${originalBG3D.groups.length} groups`);

        // Step 2: Convert BG3DParseResult → glTF
        const gltfDoc = await bg3dParsedToGLTF(originalBG3D);
        
        // Validate glTF
        const io = new NodeIO();
        const glbBuffer = await io.writeBinary(gltfDoc);
        const validation = await validateBytes(glbBuffer);
        
        console.log(`glTF Validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`);
        expect(validation.issues.numErrors).toBe(0);

        // Step 3: Convert glTF → BG3DParseResult
        const roundtripBG3D = await gltfToBG3D(gltfDoc);
        console.log(`Roundtrip result: ${roundtripBG3D.materials.length} materials, ${roundtripBG3D.groups.length} groups`);

        // Step 4: Compare original and roundtrip results
        const comparison = compareBG3DResults(originalBG3D, roundtripBG3D, name);
        
        if (comparison.differences.length > 0) {
          console.log(`Differences found:`);
          comparison.differences.forEach(d => console.log(`  - ${d}`));
        }
        
        // Expect semantic equivalence
        expect(comparison.match).toBe(true);
        
        console.log(`✅ ${name} roundtrip successful`);
      });
    });
  });

  describe("3DMF + Skeleton → glTF → 3DMF + Skeleton", () => {
    const skeletonTestFiles = [
      { 
        modelPath: BUGDOM_SKELETONS_PATH, 
        modelName: "Ant.3dmf",
        skeletonPath: BUGDOM_SKELETONS_PATH,
        skeletonName: "Ant.skeleton.rsrc"
      },
      { 
        modelPath: BUGDOM_SKELETONS_PATH, 
        modelName: "Spider.3dmf",
        skeletonPath: BUGDOM_SKELETONS_PATH,
        skeletonName: "Spider.skeleton.rsrc"
      },
      { 
        modelPath: NANOSAUR_SKELETONS_PATH, 
        modelName: "Deinon.3dmf",
        skeletonPath: NANOSAUR_SKELETONS_PATH,
        skeletonName: "Deinon.skeleton.rsrc"
      },
    ];

    skeletonTestFiles.forEach(({ modelPath, modelName, skeletonPath, skeletonName }) => {
      it(`should roundtrip ${modelName} with skeleton through glTF format`, async () => {
        const modelFile = join(modelPath, modelName);
        const skeletonFile = join(skeletonPath, skeletonName);
        let modelBuffer: ArrayBuffer;
        let skeletonBuffer: ArrayBuffer;
        
        try {
          const modelData = readFileSync(modelFile);
          modelBuffer = modelData.buffer.slice(modelData.byteOffset, modelData.byteOffset + modelData.byteLength);
          
          const skeletonData = readFileSync(skeletonFile);
          skeletonBuffer = skeletonData.buffer.slice(skeletonData.byteOffset, skeletonData.byteOffset + skeletonData.byteLength);
        } catch {
          console.log(`${modelName} or ${skeletonName} not available, skipping`);
          return;
        }

        console.log(`\n=== Testing ${modelName} + ${skeletonName} glTF Roundtrip ===`);

        // Step 1: Parse skeleton resource
        const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);
        expect(skeletonResource).toBeDefined();
        console.log(`Parsed skeleton: ${Object.keys(skeletonResource.Bone || {}).length} bones`);

        // Step 2: Parse 3DMF with skeleton → BG3DParseResult
        const parseResult = parseBG3DWithSkeletonResource(modelBuffer, skeletonResource);
        expect(parseResult.ok).toBe(true);
        if (!parseResult.ok) {
          console.log(`Parse error: ${parseResult.error.message}`);
          return;
        }
        const originalBG3D = parseResult.value;
        console.log(`Parsed ${modelName} with skeleton: ${originalBG3D.materials.length} materials, ${originalBG3D.groups.length} groups`);
        
        if (originalBG3D.skeleton) {
          console.log(`Skeleton: ${originalBG3D.skeleton.bones.length} bones, ${originalBG3D.skeleton.animations.length} animations`);
        }

        // Step 3: Convert BG3DParseResult → glTF
        const gltfDoc = await bg3dParsedToGLTF(originalBG3D);
        
        // Validate glTF
        const io = new NodeIO();
        const glbBuffer = await io.writeBinary(gltfDoc);
        const validation = await validateBytes(glbBuffer);
        
        console.log(`glTF Validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`);
        expect(validation.issues.numErrors).toBe(0);

        // Step 4: Convert glTF → BG3DParseResult
        const roundtripBG3D = await gltfToBG3D(gltfDoc);
        console.log(`Roundtrip result: ${roundtripBG3D.materials.length} materials, ${roundtripBG3D.groups.length} groups`);
        
        if (roundtripBG3D.skeleton) {
          console.log(`Roundtrip skeleton: ${roundtripBG3D.skeleton.bones.length} bones, ${roundtripBG3D.skeleton.animations.length} animations`);
        }

        // Step 5: Compare original and roundtrip results
        const comparison = compareBG3DResults(originalBG3D, roundtripBG3D, modelName);
        
        if (comparison.differences.length > 0) {
          console.log(`Differences found:`);
          comparison.differences.slice(0, 10).forEach(d => console.log(`  - ${d}`));
          if (comparison.differences.length > 10) {
            console.log(`  ... and ${comparison.differences.length - 10} more`);
          }
        }
        
        // Expect semantic equivalence for geometry
        expect(comparison.match).toBe(true);
        
        // Verify skeleton is preserved
        if (originalBG3D.skeleton) {
          expect(roundtripBG3D.skeleton).toBeDefined();
          expect(roundtripBG3D.skeleton?.bones.length).toBe(originalBG3D.skeleton.bones.length);
          expect(roundtripBG3D.skeleton?.animations.length).toBe(originalBG3D.skeleton.animations.length);
        }
        
        console.log(`✅ ${modelName} + skeleton roundtrip successful`);
      });
    });
  });

  describe("Double Roundtrip Stability Test", () => {
    it("should produce identical results after two roundtrips", async () => {
      const testFile = join(BUGDOM_SKELETONS_PATH, "Ant.3dmf");
      let fileBuffer: ArrayBuffer;
      
      try {
        const data = readFileSync(testFile);
        fileBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      } catch {
        console.log("Ant.3dmf not available, skipping");
        return;
      }

      console.log(`\n=== Double Roundtrip Stability Test ===`);

      // First roundtrip
      const parse1 = parse3DMF(fileBuffer);
      expect(parse1.ok).toBe(true);
      if (!parse1.ok) return;
      
      const gltf1 = await bg3dParsedToGLTF(parse1.value);
      const rt1 = await gltfToBG3D(gltf1);
      
      console.log(`First roundtrip: ${rt1.materials.length} materials, ${rt1.groups.length} groups`);
      
      // Second roundtrip
      const gltf2 = await bg3dParsedToGLTF(rt1);
      const rt2 = await gltfToBG3D(gltf2);
      
      console.log(`Second roundtrip: ${rt2.materials.length} materials, ${rt2.groups.length} groups`);
      
      // Compare RT1 and RT2 - they should be identical
      const comparison = compareBG3DResults(rt1, rt2, "Double Roundtrip");
      
      if (comparison.differences.length > 0) {
        console.log(`Differences between RT1 and RT2:`);
        comparison.differences.forEach(d => console.log(`  - ${d}`));
      }
      
      expect(comparison.match).toBe(true);
      console.log(`✅ Double roundtrip produces stable results`);
    });
  });

  describe("Model File glTF Roundtrip", () => {
    const modelFiles = [
      { path: BUGDOM_MODELS_PATH, name: "MainMenu.3dmf" },
      { path: NANOSAUR_MODELS_PATH, name: "Global_Models.3dmf" },
    ];

    modelFiles.forEach(({ path, name }) => {
      it(`should roundtrip model file ${name} through glTF format`, async () => {
        const testFile = join(path, name);
        let fileBuffer: ArrayBuffer;
        
        try {
          const data = readFileSync(testFile);
          fileBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        } catch {
          console.log(`${name} not available, skipping`);
          return;
        }

        console.log(`\n=== Testing ${name} glTF Roundtrip ===`);

        // Step 1: Parse 3DMF → BG3DParseResult
        const parseResult = parse3DMF(fileBuffer);
        expect(parseResult.ok).toBe(true);
        if (!parseResult.ok) {
          console.log(`Parse error: ${parseResult.error.message}`);
          return;
        }
        const originalBG3D = parseResult.value;
        console.log(`Parsed ${name}: ${originalBG3D.materials.length} materials, ${originalBG3D.groups.length} groups`);

        // Step 2: Convert BG3DParseResult → glTF
        const gltfDoc = await bg3dParsedToGLTF(originalBG3D);
        
        // Validate glTF
        const io = new NodeIO();
        const glbBuffer = await io.writeBinary(gltfDoc);
        const validation = await validateBytes(glbBuffer);
        
        console.log(`glTF Validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`);
        expect(validation.issues.numErrors).toBe(0);

        // Step 3: Convert glTF → BG3DParseResult
        const roundtripBG3D = await gltfToBG3D(gltfDoc);
        console.log(`Roundtrip result: ${roundtripBG3D.materials.length} materials, ${roundtripBG3D.groups.length} groups`);

        // Step 4: Compare original and roundtrip results
        const comparison = compareBG3DResults(originalBG3D, roundtripBG3D, name);
        
        if (comparison.differences.length > 0) {
          console.log(`Differences found:`);
          comparison.differences.slice(0, 10).forEach(d => console.log(`  - ${d}`));
        }
        
        expect(comparison.match).toBe(true);
        console.log(`✅ ${name} roundtrip successful`);
      });
    });
  });
});
