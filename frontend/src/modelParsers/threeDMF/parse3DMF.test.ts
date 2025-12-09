/**
 * Unit tests for 3DMF parser
 * Tests parsing and roundtrip conversion
 */

import { describe, it, expect, beforeAll } from "vitest";
import { parse3DMFToMetaFile } from "./parse3DMF";
import { write3DMFFromMetaFile } from "./write3DMF";
import { metaFileToBG3DParseResult, bg3dParseResultToMetaFile } from "./convert";
import { parse3DMF, bg3dParsedTo3DMF } from "../parse3dmf";
import { readFileSync } from "fs";
import { join } from "path";

// Path to test 3DMF files
const TEST_DATA_PATH = join(
  __dirname,
  "../../../../games/bugdom/Data/Models"
);

const SKELETON_PATH = join(
  __dirname,
  "../../../../games/bugdom/Data/Skeletons"
);

const NANOSAUR_MODELS_PATH = join(
  __dirname,
  "../../../../games/nanosaur/Data/Models"
);

const NANOSAUR_SKELETONS_PATH = join(
  __dirname,
  "../../../../games/nanosaur/Data/Skeletons"
);

describe("3DMF Parser", () => {
  describe("parse3DMFToMetaFile", () => {
    it("should successfully parse a simple 3DMF file", async () => {
      const testFile = join(TEST_DATA_PATH, "MainMenu.3dmf");
      let fileBuffer: ArrayBuffer;
      
      try {
        fileBuffer = readFileSync(testFile).buffer;
      } catch (e) {
        console.log("Test file not available, skipping test");
        return;
      }

      const result = parse3DMFToMetaFile(fileBuffer);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.numMeshes).toBeGreaterThan(0);
        console.log(`Parsed MainMenu.3dmf: ${result.value.numMeshes} meshes, ${result.value.numTextures} textures, ${result.value.numTopLevelGroups} groups`);
      }
    });

    it("should parse skeleton 3DMF files", async () => {
      const testFile = join(SKELETON_PATH, "Ant.3dmf");
      let fileBuffer: ArrayBuffer;
      
      try {
        fileBuffer = readFileSync(testFile).buffer;
      } catch (e) {
        console.log("Test file not available, skipping test");
        return;
      }

      const result = parse3DMFToMetaFile(fileBuffer);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.numMeshes).toBeGreaterThan(0);
        console.log(`Parsed Ant.3dmf: ${result.value.numMeshes} meshes`);
      }
    });

    it("should parse Nanosaur model files", async () => {
      const testFile = join(NANOSAUR_MODELS_PATH, "Global_Models.3dmf");
      let fileBuffer: ArrayBuffer;
      
      try {
        fileBuffer = readFileSync(testFile).buffer;
      } catch (e) {
        console.log("Test file not available, skipping test");
        return;
      }

      const result = parse3DMFToMetaFile(fileBuffer);

      expect(result.ok).toBe(true);
      if (result.ok) {
        console.log(`Parsed Global_Models.3dmf: ${result.value.numMeshes} meshes, ${result.value.numTextures} textures`);
      }
    });

    it("should return error for invalid 3DMF file", () => {
      const invalidBuffer = new ArrayBuffer(100);
      const result = parse3DMFToMetaFile(invalidBuffer);

      expect(result.ok).toBe(false);
    });
  });

  describe("metaFileToBG3DParseResult", () => {
    it("should convert TQ3MetaFile to BG3DParseResult", async () => {
      const testFile = join(TEST_DATA_PATH, "MainMenu.3dmf");
      let fileBuffer: ArrayBuffer;
      
      try {
        fileBuffer = readFileSync(testFile).buffer;
      } catch (e) {
        console.log("Test file not available, skipping test");
        return;
      }

      const parseResult = parse3DMFToMetaFile(fileBuffer);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const convertResult = metaFileToBG3DParseResult(parseResult.value);
      expect(convertResult.ok).toBe(true);
      if (convertResult.ok) {
        expect(convertResult.value.materials.length).toBeGreaterThan(0);
        expect(convertResult.value.groups.length).toBeGreaterThan(0);
      }
    });
  });

  describe("parse3DMF (high-level API)", () => {
    it("should parse 3DMF directly to BG3DParseResult", async () => {
      const testFile = join(TEST_DATA_PATH, "MainMenu.3dmf");
      let fileBuffer: ArrayBuffer;
      
      try {
        fileBuffer = readFileSync(testFile).buffer;
      } catch (e) {
        console.log("Test file not available, skipping test");
        return;
      }

      const result = parse3DMF(fileBuffer);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.materials).toBeDefined();
        expect(result.value.groups).toBeDefined();
      }
    });
  });

  describe("Roundtrip Conversion", () => {
    it("should roundtrip a 3DMF file with minimal data loss", async () => {
      const testFile = join(SKELETON_PATH, "Ant.3dmf");
      let originalBuffer: ArrayBuffer;
      
      try {
        originalBuffer = readFileSync(testFile).buffer;
      } catch (e) {
        console.log("Test file not available, skipping test");
        return;
      }

      // Parse original
      const parseResult = parse3DMFToMetaFile(originalBuffer);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const originalMetaFile = parseResult.value;

      // Write back to 3DMF
      const writeResult = write3DMFFromMetaFile(originalMetaFile);
      expect(writeResult.ok).toBe(true);
      if (!writeResult.ok) return;

      // Parse written file
      const reParseResult = parse3DMFToMetaFile(writeResult.value);
      expect(reParseResult.ok).toBe(true);
      if (!reParseResult.ok) return;

      const reloadedMetaFile = reParseResult.value;

      // Compare structure
      expect(reloadedMetaFile.numMeshes).toBe(originalMetaFile.numMeshes);

      // Compare mesh data
      for (let i = 0; i < originalMetaFile.numMeshes && i < reloadedMetaFile.numMeshes; i++) {
        const originalMesh = originalMetaFile.meshes[i];
        const reloadedMesh = reloadedMetaFile.meshes[i];

        if (originalMesh && reloadedMesh) {
          expect(reloadedMesh.numTriangles).toBe(originalMesh.numTriangles);
          expect(reloadedMesh.numPoints).toBe(originalMesh.numPoints);

          // Compare vertices (with floating point tolerance)
          for (let j = 0; j < Math.min(originalMesh.numPoints, reloadedMesh.numPoints); j++) {
            const origPoint = originalMesh.points[j];
            const reloadedPoint = reloadedMesh.points[j];
            if (origPoint && reloadedPoint) {
              expect(reloadedPoint.x).toBeCloseTo(origPoint.x, 5);
              expect(reloadedPoint.y).toBeCloseTo(origPoint.y, 5);
              expect(reloadedPoint.z).toBeCloseTo(origPoint.z, 5);
            }
          }
        }
      }

      console.log(`Roundtrip successful: ${originalMetaFile.numMeshes} meshes preserved`);
    });

    it("should roundtrip through BG3D format", async () => {
      const testFile = join(SKELETON_PATH, "Ant.3dmf");
      let originalBuffer: ArrayBuffer;
      
      try {
        originalBuffer = readFileSync(testFile).buffer;
      } catch (e) {
        console.log("Test file not available, skipping test");
        return;
      }

      // Parse to BG3D format
      const parseResult = parse3DMF(originalBuffer);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const bg3dData = parseResult.value;

      // Convert back to 3DMF
      const writeResult = bg3dParsedTo3DMF(bg3dData);
      expect(writeResult.ok).toBe(true);
      if (!writeResult.ok) return;

      // Re-parse
      const reParseResult = parse3DMF(writeResult.value);
      expect(reParseResult.ok).toBe(true);
      if (!reParseResult.ok) return;

      const reloadedBg3d = reParseResult.value;

      // Compare
      expect(reloadedBg3d.materials.length).toBeGreaterThan(0);
      expect(reloadedBg3d.groups.length).toBeGreaterThan(0);

      console.log(`BG3D roundtrip successful`);
    });
  });

  describe("Multiple Files", () => {
    const bugdomModelFiles = [
      "MainMenu.3dmf",
      "Title.3dmf",
      "HighScores.3dmf",
    ];

    const bugdomSkeletonFiles = [
      "Ant.3dmf",
      "Spider.3dmf",
      "Slug.3dmf",
    ];

    bugdomModelFiles.forEach((filename) => {
      it(`should parse Bugdom model: ${filename}`, async () => {
        const testFile = join(TEST_DATA_PATH, filename);
        let fileBuffer: ArrayBuffer;
        
        try {
          fileBuffer = readFileSync(testFile).buffer;
        } catch (e) {
          console.log(`${filename} not available, skipping`);
          return;
        }

        const result = parse3DMFToMetaFile(fileBuffer);
        expect(result.ok).toBe(true);
        if (result.ok) {
          console.log(`${filename}: ${result.value.numMeshes} meshes`);
        }
      });
    });

    bugdomSkeletonFiles.forEach((filename) => {
      it(`should parse Bugdom skeleton: ${filename}`, async () => {
        const testFile = join(SKELETON_PATH, filename);
        let fileBuffer: ArrayBuffer;
        
        try {
          fileBuffer = readFileSync(testFile).buffer;
        } catch (e) {
          console.log(`${filename} not available, skipping`);
          return;
        }

        const result = parse3DMFToMetaFile(fileBuffer);
        expect(result.ok).toBe(true);
        if (result.ok) {
          console.log(`${filename}: ${result.value.numMeshes} meshes`);
        }
      });
    });
  });
});
