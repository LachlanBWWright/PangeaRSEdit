/**
 * glTF Roundtrip Tests for 3DMF files
 * Tests the complete conversion pipeline: 3DMF → BG3DParseResult → glTF → BG3DParseResult → 3DMF
 * This ensures that 3DMF files can be fully converted to glTF and back with accuracy
 */

import { describe, it, expect } from "vitest";
import { parse3DMF } from "../parse3dmf";
import { bg3dParsedToGLTF, gltfToBG3D } from "../parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "../skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3DWithSkeletonResource } from "../bg3dWithSkeleton";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";
import {
  BUGDOM_SKELETONS_PATH,
  BUGDOM_MODELS_PATH,
  NANOSAUR_SKELETONS_PATH,
  NANOSAUR_MODELS_PATH,
  compareBG3DResults,
} from "./gltfRoundtripTestHelpers";

describe.skip("3DMF glTF Full Roundtrip Tests", () => {
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
        if (!existsSync(testFile)) {
          console.log(`${name} not available, skipping`);
          return;
        }
        const fileData = readFileSync(testFile);
        const fileBuffer = fileData.buffer.slice(
          fileData.byteOffset,
          fileData.byteOffset + fileData.byteLength,
        );

        console.log(`\n=== Testing ${name} glTF Roundtrip ===`);

        // Step 1: Parse 3DMF → BG3DParseResult
        const parseResult = parse3DMF(fileBuffer);
        expect(parseResult.isOk()).toBe(true);
        if (!parseResult.isOk()) {
          console.log(`Parse error: ${parseResult.error}`);
          return;
        }
        const originalBG3D = parseResult.value;
        console.log(
          `Parsed ${name}: ${originalBG3D.materials.length} materials, ${originalBG3D.groups.length} groups`,
        );

        // Step 2: Convert BG3DParseResult → glTF
        const gltfDoc = await bg3dParsedToGLTF(originalBG3D);

        // Validate glTF
        const io = new NodeIO();
        const glbBuffer = await io.writeBinary(gltfDoc);
        const validation = await validateBytes(glbBuffer);

        console.log(
          `glTF Validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`,
        );
        expect(validation.issues.numErrors).toBe(0);

        // Step 3: Convert glTF → BG3DParseResult
        const roundtripBG3D = await gltfToBG3D(gltfDoc);
        console.log(
          `Roundtrip result: ${roundtripBG3D.materials.length} materials, ${roundtripBG3D.groups.length} groups`,
        );

        // Step 4: Compare original and roundtrip results
        const comparison = compareBG3DResults(
          originalBG3D,
          roundtripBG3D,
          name,
        );

        if (comparison.differences.length > 0) {
          console.log(`Differences found:`);
          comparison.differences.forEach((d) => console.log(`  - ${d}`));
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
        skeletonName: "Ant.skeleton.rsrc",
      },
      {
        modelPath: BUGDOM_SKELETONS_PATH,
        modelName: "Spider.3dmf",
        skeletonPath: BUGDOM_SKELETONS_PATH,
        skeletonName: "Spider.skeleton.rsrc",
      },
      {
        modelPath: NANOSAUR_SKELETONS_PATH,
        modelName: "Deinon.3dmf",
        skeletonPath: NANOSAUR_SKELETONS_PATH,
        skeletonName: "Deinon.skeleton.rsrc",
      },
    ];

    skeletonTestFiles.forEach(
      ({ modelPath, modelName, skeletonPath, skeletonName }) => {
        it(`should roundtrip ${modelName} with skeleton through glTF format`, async () => {
          const modelFile = join(modelPath, modelName);
          const skeletonFile = join(skeletonPath, skeletonName);
          if (!existsSync(modelFile) || !existsSync(skeletonFile)) {
            console.log(
              `${modelName} or ${skeletonName} not available, skipping`,
            );
            return;
          }
          const modelData = readFileSync(modelFile);
          const modelBuffer = modelData.buffer.slice(
            modelData.byteOffset,
            modelData.byteOffset + modelData.byteLength,
          );

          const skeletonData = readFileSync(skeletonFile);
          const skeletonBuffer = skeletonData.buffer.slice(
            skeletonData.byteOffset,
            skeletonData.byteOffset + skeletonData.byteLength,
          );

          console.log(
            `\n=== Testing ${modelName} + ${skeletonName} glTF Roundtrip ===`,
          );

          // Step 1: Parse skeleton resource
          const skeletonResource = await parseSkeletonRsrc(skeletonBuffer);
          expect(skeletonResource).toBeDefined();
          console.log(
            `Parsed skeleton: ${Object.keys(skeletonResource.Bone || {}).length} bones`,
          );

          // Step 2: Parse 3DMF with skeleton → BG3DParseResult
          const parseResult = parseBG3DWithSkeletonResource(
            modelBuffer,
            skeletonResource,
          );
          expect(parseResult.isOk()).toBe(true);
          if (!parseResult.isOk()) {
            console.log(`Parse error: ${parseResult.error}`);
            return;
          }
          const originalBG3D = parseResult.value;
          console.log(
            `Parsed ${modelName} with skeleton: ${originalBG3D.materials.length} materials, ${originalBG3D.groups.length} groups`,
          );

          if (originalBG3D.skeleton) {
            console.log(
              `Skeleton: ${originalBG3D.skeleton.bones.length} bones, ${originalBG3D.skeleton.animations.length} animations`,
            );
          }

          // Step 3: Convert BG3DParseResult → glTF
          const gltfDoc = await bg3dParsedToGLTF(originalBG3D);

          // Validate glTF
          const io = new NodeIO();
          const glbBuffer = await io.writeBinary(gltfDoc);
          const validation = await validateBytes(glbBuffer);

          console.log(
            `glTF Validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`,
          );
          expect(validation.issues.numErrors).toBe(0);

          // Step 4: Convert glTF → BG3DParseResult
          const roundtripBG3D = await gltfToBG3D(gltfDoc);
          console.log(
            `Roundtrip result: ${roundtripBG3D.materials.length} materials, ${roundtripBG3D.groups.length} groups`,
          );

          if (roundtripBG3D.skeleton) {
            console.log(
              `Roundtrip skeleton: ${roundtripBG3D.skeleton.bones.length} bones, ${roundtripBG3D.skeleton.animations.length} animations`,
            );
          }

          // Step 5: Compare original and roundtrip results
          const comparison = compareBG3DResults(
            originalBG3D,
            roundtripBG3D,
            modelName,
          );

          if (comparison.differences.length > 0) {
            console.log(`Differences found:`);
            comparison.differences
              .slice(0, 10)
              .forEach((d) => console.log(`  - ${d}`));
            if (comparison.differences.length > 10) {
              console.log(
                `  ... and ${comparison.differences.length - 10} more`,
              );
            }
          }

          // Expect semantic equivalence for geometry
          expect(comparison.match).toBe(true);

          // Verify skeleton is preserved
          if (originalBG3D.skeleton) {
            expect(roundtripBG3D.skeleton).toBeDefined();
            expect(roundtripBG3D.skeleton?.bones.length).toBe(
              originalBG3D.skeleton.bones.length,
            );
            expect(roundtripBG3D.skeleton?.animations.length).toBe(
              originalBG3D.skeleton.animations.length,
            );
          }

          console.log(`✅ ${modelName} + skeleton roundtrip successful`);
        });
      },
    );
  });

  describe("Double Roundtrip Stability Test", () => {
    it("should produce identical results after two roundtrips", async () => {
      const testFile = join(BUGDOM_SKELETONS_PATH, "Ant.3dmf");
      if (!existsSync(testFile)) {
        console.log("Ant.3dmf not available, skipping");
        return;
      }
      const data = readFileSync(testFile);
      const fileBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      );

      console.log(`\n=== Double Roundtrip Stability Test ===`);

      // First roundtrip
      const parse1 = parse3DMF(fileBuffer);
      expect(parse1.isOk()).toBe(true);
      if (!parse1.isOk()) return;

      const gltf1 = await bg3dParsedToGLTF(parse1.value);
      const rt1 = await gltfToBG3D(gltf1);

      console.log(
        `First roundtrip: ${rt1.materials.length} materials, ${rt1.groups.length} groups`,
      );

      // Second roundtrip
      const gltf2 = await bg3dParsedToGLTF(rt1);
      const rt2 = await gltfToBG3D(gltf2);

      console.log(
        `Second roundtrip: ${rt2.materials.length} materials, ${rt2.groups.length} groups`,
      );

      // Compare RT1 and RT2 - they should be identical
      const comparison = compareBG3DResults(rt1, rt2, "Double Roundtrip");

      if (comparison.differences.length > 0) {
        console.log(`Differences between RT1 and RT2:`);
        comparison.differences.forEach((d) => console.log(`  - ${d}`));
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
        if (!existsSync(testFile)) {
          console.log(`${name} not available, skipping`);
          return;
        }
        const fileData = readFileSync(testFile);
        const fileBuffer = fileData.buffer.slice(
          fileData.byteOffset,
          fileData.byteOffset + fileData.byteLength,
        );

        console.log(`\n=== Testing ${name} glTF Roundtrip ===`);

        // Step 1: Parse 3DMF → BG3DParseResult
        const parseResult = parse3DMF(fileBuffer);
        expect(parseResult.isOk()).toBe(true);
        if (!parseResult.isOk()) {
          console.log(`Parse error: ${parseResult.error}`);
          return;
        }
        const originalBG3D = parseResult.value;
        console.log(
          `Parsed ${name}: ${originalBG3D.materials.length} materials, ${originalBG3D.groups.length} groups`,
        );

        // Step 2: Convert BG3DParseResult → glTF
        const gltfDoc = await bg3dParsedToGLTF(originalBG3D);

        // Validate glTF
        const io = new NodeIO();
        const glbBuffer = await io.writeBinary(gltfDoc);
        const validation = await validateBytes(glbBuffer);

        console.log(
          `glTF Validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`,
        );
        expect(validation.issues.numErrors).toBe(0);

        // Step 3: Convert glTF → BG3DParseResult
        const roundtripBG3D = await gltfToBG3D(gltfDoc);
        console.log(
          `Roundtrip result: ${roundtripBG3D.materials.length} materials, ${roundtripBG3D.groups.length} groups`,
        );

        // Step 4: Compare original and roundtrip results
        const comparison = compareBG3DResults(
          originalBG3D,
          roundtripBG3D,
          name,
        );

        if (comparison.differences.length > 0) {
          console.log(`Differences found:`);
          comparison.differences
            .slice(0, 10)
            .forEach((d) => console.log(`  - ${d}`));
        }

        expect(comparison.match).toBe(true);
        console.log(`✅ ${name} roundtrip successful`);
      });
    });
  });
});
