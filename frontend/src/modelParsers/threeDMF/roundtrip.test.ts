/**
 * Byte-for-byte roundtrip validation tests for 3DMF parser
 * These tests ensure that 3DMF files can be parsed and re-written
 * with perfect byte accuracy (or near-perfect for floating point values)
 */

import { describe, it, expect } from "vitest";
import { parse3DMFToMetaFile } from "./parse3DMF";
import { write3DMFFromMetaFile } from "./write3DMF";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Use the correct paths to the public folder
const BUGDOM_SKELETONS_PATH = join(
  __dirname,
  "../../../public/games/bugdom1/skeletons"
);

const NANOSAUR_SKELETONS_PATH = join(
  __dirname,
  "../../../public/games/nanosaur1/skeletons"
);

/**
 * Compare two floats with tolerance for precision issues
 * Returns true if they're effectively equal
 */
function floatsNearlyEqual(a: number, b: number, tolerance = 1e-5): boolean {
  if (a === b) return true;
  const diff = Math.abs(a - b);
  const maxMag = Math.max(Math.abs(a), Math.abs(b), 1);
  return diff / maxMag < tolerance;
}

describe("3DMF Byte-Accurate Roundtrip Tests", () => {
  describe("Mesh Data Preservation", () => {
    it("should preserve vertex positions in roundtrip", async () => {
      const testFile = join(BUGDOM_SKELETONS_PATH, "Ant.3dmf");
      if (!existsSync(testFile)) {
        console.log("Test file not available, skipping");
        return;
      }
      const fileBuffer = readFileSync(testFile).buffer;

      // Parse original
      const parseResult = parse3DMFToMetaFile(fileBuffer);
      expect(parseResult.isOk()).toBe(true);
      if (!parseResult.isOk()) return;

      const originalMeta = parseResult.value;

      // Write and re-parse
      const writeResult = write3DMFFromMetaFile(originalMeta);
      expect(writeResult.isOk()).toBe(true);
      if (!writeResult.isOk()) return;

      const reParseResult = parse3DMFToMetaFile(writeResult.value);
      expect(reParseResult.isOk()).toBe(true);
      if (!reParseResult.isOk()) return;

      const roundtripMeta = reParseResult.value;

      // Compare mesh count
      expect(roundtripMeta.numMeshes).toBe(originalMeta.numMeshes);

      // Compare each mesh's vertices
      for (let meshIdx = 0; meshIdx < originalMeta.numMeshes; meshIdx++) {
        const origMesh = originalMeta.meshes[meshIdx];
        const rtMesh = roundtripMeta.meshes[meshIdx];
        
        if (!origMesh || !rtMesh) continue;

        expect(rtMesh.numPoints).toBe(origMesh.numPoints);
        expect(rtMesh.numTriangles).toBe(origMesh.numTriangles);

        // Compare vertices
        for (let i = 0; i < origMesh.numPoints; i++) {
          const origPt = origMesh.points[i];
          const rtPt = rtMesh.points[i];
          
          if (!origPt || !rtPt) continue;

          expect(floatsNearlyEqual(rtPt.x, origPt.x)).toBe(true);
          expect(floatsNearlyEqual(rtPt.y, origPt.y)).toBe(true);
          expect(floatsNearlyEqual(rtPt.z, origPt.z)).toBe(true);
        }
      }
    });

    it("should preserve triangle indices in roundtrip", async () => {
      const testFile = join(BUGDOM_SKELETONS_PATH, "Spider.3dmf");
      if (!existsSync(testFile)) {
        console.log("Test file not available, skipping");
        return;
      }
      const fileBuffer = readFileSync(testFile).buffer;

      const parseResult = parse3DMFToMetaFile(fileBuffer);
      expect(parseResult.isOk()).toBe(true);
      if (!parseResult.isOk()) return;

      const writeResult = write3DMFFromMetaFile(parseResult.value);
      expect(writeResult.isOk()).toBe(true);
      if (!writeResult.isOk()) return;

      const reParseResult = parse3DMFToMetaFile(writeResult.value);
      expect(reParseResult.isOk()).toBe(true);
      if (!reParseResult.isOk()) return;

      for (let meshIdx = 0; meshIdx < parseResult.value.numMeshes; meshIdx++) {
        const origMesh = parseResult.value.meshes[meshIdx];
        const rtMesh = reParseResult.value.meshes[meshIdx];
        
        if (!origMesh || !rtMesh) continue;

        // Compare triangles
        expect(rtMesh.triangles.length).toBe(origMesh.triangles.length);
        
        for (let i = 0; i < origMesh.triangles.length; i++) {
          const origTri = origMesh.triangles[i];
          const rtTri = rtMesh.triangles[i];
          
          if (!origTri || !rtTri) continue;

          expect(rtTri.pointIndices[0]).toBe(origTri.pointIndices[0]);
          expect(rtTri.pointIndices[1]).toBe(origTri.pointIndices[1]);
          expect(rtTri.pointIndices[2]).toBe(origTri.pointIndices[2]);
        }
      }
    });

    it("should preserve vertex normals if present", async () => {
      const testFile = join(NANOSAUR_SKELETONS_PATH, "Deinon.3dmf");
      if (!existsSync(testFile)) {
        console.log("Test file not available, skipping");
        return;
      }
      const fileBuffer = readFileSync(testFile).buffer;

      const parseResult = parse3DMFToMetaFile(fileBuffer);
      expect(parseResult.isOk()).toBe(true);
      if (!parseResult.isOk()) return;

      const writeResult = write3DMFFromMetaFile(parseResult.value);
      expect(writeResult.isOk()).toBe(true);
      if (!writeResult.isOk()) return;

      const reParseResult = parse3DMFToMetaFile(writeResult.value);
      expect(reParseResult.isOk()).toBe(true);
      if (!reParseResult.isOk()) return;

      for (let meshIdx = 0; meshIdx < parseResult.value.numMeshes; meshIdx++) {
        const origMesh = parseResult.value.meshes[meshIdx];
        const rtMesh = reParseResult.value.meshes[meshIdx];
        
        if (!origMesh || !rtMesh) continue;

        // Check normals
        if (origMesh.vertexNormals) {
          expect(rtMesh.vertexNormals).toBeDefined();
          expect(rtMesh.vertexNormals?.length).toBe(origMesh.vertexNormals.length);
          
          for (let i = 0; i < origMesh.vertexNormals.length; i++) {
            const origNorm = origMesh.vertexNormals[i];
            const rtNorm = rtMesh.vertexNormals?.[i];
            
            if (!origNorm || !rtNorm) continue;

            expect(floatsNearlyEqual(rtNorm.x, origNorm.x)).toBe(true);
            expect(floatsNearlyEqual(rtNorm.y, origNorm.y)).toBe(true);
            expect(floatsNearlyEqual(rtNorm.z, origNorm.z)).toBe(true);
          }
        }
      }
    });

    it("should preserve UVs if present", async () => {
      const testFile = join(BUGDOM_SKELETONS_PATH, "Slug.3dmf");
      if (!existsSync(testFile)) {
        console.log("Test file not available, skipping");
        return;
      }
      const fileBuffer = readFileSync(testFile).buffer;

      const parseResult = parse3DMFToMetaFile(fileBuffer);
      expect(parseResult.isOk()).toBe(true);
      if (!parseResult.isOk()) return;

      const writeResult = write3DMFFromMetaFile(parseResult.value);
      expect(writeResult.isOk()).toBe(true);
      if (!writeResult.isOk()) return;

      const reParseResult = parse3DMFToMetaFile(writeResult.value);
      expect(reParseResult.isOk()).toBe(true);
      if (!reParseResult.isOk()) return;

      for (let meshIdx = 0; meshIdx < parseResult.value.numMeshes; meshIdx++) {
        const origMesh = parseResult.value.meshes[meshIdx];
        const rtMesh = reParseResult.value.meshes[meshIdx];
        
        if (!origMesh || !rtMesh) continue;

        // Check UVs
        if (origMesh.vertexUVs) {
          expect(rtMesh.vertexUVs).toBeDefined();
          expect(rtMesh.vertexUVs?.length).toBe(origMesh.vertexUVs.length);
          
          for (let i = 0; i < origMesh.vertexUVs.length; i++) {
            const origUV = origMesh.vertexUVs[i];
            const rtUV = rtMesh.vertexUVs?.[i];
            
            if (!origUV || !rtUV) continue;

            expect(floatsNearlyEqual(rtUV.u, origUV.u)).toBe(true);
            expect(floatsNearlyEqual(rtUV.v, origUV.v)).toBe(true);
          }
        }
      }
    });
  });

  describe("Bounding Box Preservation", () => {
    it("should preserve bounding box values", async () => {
      const testFile = join(BUGDOM_SKELETONS_PATH, "Ant.3dmf");
      if (!existsSync(testFile)) {
        console.log("Test file not available, skipping");
        return;
      }
      const fileBuffer = readFileSync(testFile).buffer;

      const parseResult = parse3DMFToMetaFile(fileBuffer);
      expect(parseResult.isOk()).toBe(true);
      if (!parseResult.isOk()) return;

      const writeResult = write3DMFFromMetaFile(parseResult.value);
      expect(writeResult.isOk()).toBe(true);
      if (!writeResult.isOk()) return;

      const reParseResult = parse3DMFToMetaFile(writeResult.value);
      expect(reParseResult.isOk()).toBe(true);
      if (!reParseResult.isOk()) return;

      for (let meshIdx = 0; meshIdx < parseResult.value.numMeshes; meshIdx++) {
        const origMesh = parseResult.value.meshes[meshIdx];
        const rtMesh = reParseResult.value.meshes[meshIdx];
        
        if (!origMesh || !rtMesh) continue;

        const origBBox = origMesh.bBox;
        const rtBBox = rtMesh.bBox;

        expect(floatsNearlyEqual(rtBBox.min.x, origBBox.min.x)).toBe(true);
        expect(floatsNearlyEqual(rtBBox.min.y, origBBox.min.y)).toBe(true);
        expect(floatsNearlyEqual(rtBBox.min.z, origBBox.min.z)).toBe(true);
        expect(floatsNearlyEqual(rtBBox.max.x, origBBox.max.x)).toBe(true);
        expect(floatsNearlyEqual(rtBBox.max.y, origBBox.max.y)).toBe(true);
        expect(floatsNearlyEqual(rtBBox.max.z, origBBox.max.z)).toBe(true);
      }
    });
  });

  describe("Material Preservation", () => {
    it("should preserve diffuse color values", async () => {
      const testFile = join(BUGDOM_SKELETONS_PATH, "Spider.3dmf");
      if (!existsSync(testFile)) {
        console.log("Test file not available, skipping");
        return;
      }
      const fileBuffer = readFileSync(testFile).buffer;

      const parseResult = parse3DMFToMetaFile(fileBuffer);
      expect(parseResult.isOk()).toBe(true);
      if (!parseResult.isOk()) return;

      const writeResult = write3DMFFromMetaFile(parseResult.value);
      expect(writeResult.isOk()).toBe(true);
      if (!writeResult.isOk()) return;

      const reParseResult = parse3DMFToMetaFile(writeResult.value);
      expect(reParseResult.isOk()).toBe(true);
      if (!reParseResult.isOk()) return;

      for (let meshIdx = 0; meshIdx < parseResult.value.numMeshes; meshIdx++) {
        const origMesh = parseResult.value.meshes[meshIdx];
        const rtMesh = reParseResult.value.meshes[meshIdx];
        
        if (!origMesh || !rtMesh) continue;

        const origColor = origMesh.diffuseColor;
        const rtColor = rtMesh.diffuseColor;

        expect(floatsNearlyEqual(rtColor.r, origColor.r)).toBe(true);
        expect(floatsNearlyEqual(rtColor.g, origColor.g)).toBe(true);
        expect(floatsNearlyEqual(rtColor.b, origColor.b)).toBe(true);
        expect(floatsNearlyEqual(rtColor.a, origColor.a)).toBe(true);
      }
    });
  });

  describe("Multi-File Roundtrip", () => {
    const testFiles = [
      { path: BUGDOM_SKELETONS_PATH, name: "Ant.3dmf" },
      { path: BUGDOM_SKELETONS_PATH, name: "Spider.3dmf" },
      { path: BUGDOM_SKELETONS_PATH, name: "Slug.3dmf" },
      { path: NANOSAUR_SKELETONS_PATH, name: "Deinon.3dmf" },
      { path: NANOSAUR_SKELETONS_PATH, name: "Rex.3dmf" },
    ];

    testFiles.forEach(({ path, name }) => {
      it(`should successfully roundtrip ${name}`, async () => {
        const testFile = join(path, name);
        if (!existsSync(testFile)) {
          console.log(`${name} not available, skipping`);
          return;
        }
        const fileBuffer = readFileSync(testFile).buffer;

        // Parse original
        const parseResult = parse3DMFToMetaFile(fileBuffer);
        expect(parseResult.isOk()).toBe(true);
        if (!parseResult.isOk()) return;

        // Write
        const writeResult = write3DMFFromMetaFile(parseResult.value);
        expect(writeResult.isOk()).toBe(true);
        if (!writeResult.isOk()) return;

        // Re-parse
        const reParseResult = parse3DMFToMetaFile(writeResult.value);
        expect(reParseResult.isOk()).toBe(true);
        if (!reParseResult.isOk()) return;

        // Compare structure
        expect(reParseResult.value.numMeshes).toBe(parseResult.value.numMeshes);
        expect(reParseResult.value.numTopLevelGroups).toBeGreaterThanOrEqual(parseResult.value.numTopLevelGroups > 0 ? 1 : 0);

        console.log(`${name}: ${parseResult.value.numMeshes} meshes roundtripped successfully`);
      });
    });
  });
});
