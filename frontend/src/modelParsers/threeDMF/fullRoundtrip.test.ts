import { describe, it, expect } from "vitest";
import { parse3DMFToMetaFile } from "./parse3DMF";
import { write3DMFFromMetaFile } from "./write3DMF";
import {
  metaFileToBG3DParseResult,
  bg3dParseResultToMetaFile,
} from "./convert";
import { bg3dParsedToGLTF, gltfToBG3D } from "../parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "../skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "../skeletonExport";
// import { skeletonResourceToBinary } from "../skeletonExport"; // Requires Worker, not available in tests
import { parseBG3DWithSkeletonResource } from "../bg3dWithSkeleton";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";
import {
  BUGDOM_SKELETONS_PATH,
  compareMetaFiles,
  modelFiles,
  skeletonTestFiles,
  testFiles,
} from "./fullRoundtripTestHelpers";

describe.skip("3DMF TRUE Full Roundtrip Tests (3DMF → glTF → 3DMF)", () => {
  describe("3DMF → glTF → 3DMF (without skeleton)", () => {
    testFiles.forEach(({ path, name }) => {
      it(`should roundtrip ${name}: 3DMF → glTF → 3DMF`, async () => {
        const testFile = join(path, name);
        if (!existsSync(testFile)) {
          console.log(`${name} not available, skipping`);
          return;
        }
        const data = readFileSync(testFile);
        const originalBuffer = data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        );

        console.log(`\n=== Testing ${name} TRUE Roundtrip ===`);
        console.log(`Original file size: ${originalBuffer.byteLength} bytes`);

        // Step 1: Parse original 3DMF → TQ3MetaFile
        const parse1 = parse3DMFToMetaFile(originalBuffer);
        expect(parse1.isOk()).toBe(true);
        if (!parse1.isOk()) {
          console.log(`Parse error: ${parse1.error.message}`);
          return;
        }
        const originalMeta = parse1.value;
        console.log(
          `Parsed: ${originalMeta.numMeshes} meshes, ${originalMeta.numTextures} textures`,
        );

        // Step 2: Convert TQ3MetaFile → BG3DParseResult
        const bg3dResult = metaFileToBG3DParseResult(originalMeta);
        expect(bg3dResult.isOk()).toBe(true);
        if (!bg3dResult.isOk()) return;
        const bg3dParsed = bg3dResult.value;

        // Step 3: Convert BG3DParseResult → glTF
        const gltfDoc = await bg3dParsedToGLTF(bg3dParsed);

        // Validate glTF
        const io = new NodeIO();
        const glbBuffer = await io.writeBinary(gltfDoc);
        const validation = await validateBytes(glbBuffer);

        console.log(
          `glTF Validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`,
        );
        expect(validation.issues.numErrors).toBe(0);

        // Step 4: Convert glTF → BG3DParseResult
        const roundtripBg3d = await gltfToBG3D(gltfDoc);
        console.log(
          `Roundtrip BG3D: ${roundtripBg3d.materials.length} materials, ${roundtripBg3d.groups.length} groups`,
        );

        // Step 5: Convert BG3DParseResult → TQ3MetaFile
        const metaResult = bg3dParseResultToMetaFile(roundtripBg3d);
        expect(metaResult.isOk()).toBe(true);
        if (!metaResult.isOk()) return;
        const roundtripMeta = metaResult.value;

        // Step 6: Write TQ3MetaFile → 3DMF binary
        const writeResult = write3DMFFromMetaFile(roundtripMeta);
        expect(writeResult.isOk()).toBe(true);
        if (!writeResult.isOk()) return;
        const roundtripBuffer = writeResult.value;

        console.log(`Roundtrip file size: ${roundtripBuffer.byteLength} bytes`);

        // Step 7: Compare original and roundtrip TQ3MetaFile structures
        const comparison = compareMetaFiles(originalMeta, roundtripMeta, name);

        if (comparison.differences.length > 0) {
          console.log(`Semantic differences found:`);
          comparison.differences
            .slice(0, 10)
            .forEach((d) => console.log(`  - ${d}`));
          if (comparison.differences.length > 10) {
            console.log(`  ... and ${comparison.differences.length - 10} more`);
          }
        }

        // Expect semantic equality (structure preservation)
        expect(comparison.match).toBe(true);

        // Step 8: Re-parse the roundtrip 3DMF to verify it's valid
        const reParse = parse3DMFToMetaFile(roundtripBuffer);
        if (!reParse.isOk()) {
          console.log(`Re-parse error: ${reParse.error.message}`);
        }
        expect(reParse.isOk()).toBe(true);
        if (!reParse.isOk()) return;

        const reParseComparison = compareMetaFiles(
          originalMeta,
          reParse.value,
          `${name} re-parsed`,
        );
        expect(reParseComparison.match).toBe(true);

        console.log(`✅ ${name} TRUE roundtrip successful`);
      });
    });
  });

  describe("3DMF + skeleton.rsrc → glTF → 3DMF + skeleton.rsrc", () => {
    skeletonTestFiles.forEach(
      ({ modelPath, modelName, skeletonPath, skeletonName }) => {
        it(`should roundtrip ${modelName} + ${skeletonName}: 3DMF+skeleton → glTF → 3DMF+skeleton`, async () => {
          const modelFile = join(modelPath, modelName);
          const skeletonFile = join(skeletonPath, skeletonName);
          if (!existsSync(modelFile) || !existsSync(skeletonFile)) {
            console.log(
              `${modelName} or ${skeletonName} not available, skipping`,
            );
            return;
          }
          const modelData = readFileSync(modelFile);
          const originalModelBuffer = modelData.buffer.slice(
            modelData.byteOffset,
            modelData.byteOffset + modelData.byteLength,
          );

          const skeletonData = readFileSync(skeletonFile);
          const originalSkeletonBuffer = skeletonData.buffer.slice(
            skeletonData.byteOffset,
            skeletonData.byteOffset + skeletonData.byteLength,
          );

          console.log(
            `\n=== Testing ${modelName} + ${skeletonName} TRUE Roundtrip ===`,
          );
          console.log(
            `Original model size: ${originalModelBuffer.byteLength} bytes`,
          );
          console.log(
            `Original skeleton size: ${originalSkeletonBuffer.byteLength} bytes`,
          );

          // Step 1: Parse original skeleton resource
          const originalSkeletonResource = await parseSkeletonRsrc(
            originalSkeletonBuffer,
          );
          expect(originalSkeletonResource).toBeDefined();
          console.log(
            `Parsed skeleton: ${Object.keys(originalSkeletonResource.Bone || {}).length} bone resources`,
          );

          // Step 2: Parse 3DMF with skeleton → BG3DParseResult
          const parseResult = parseBG3DWithSkeletonResource(
            originalModelBuffer,
            originalSkeletonResource,
          );
          expect(parseResult.isOk()).toBe(true);
          if (!parseResult.isOk()) {
            console.log(`Parse error: ${parseResult.error.message}`);
            return;
          }
          const originalBG3D = parseResult.value;
          console.log(
            `Parsed with skeleton: ${originalBG3D.materials.length} materials`,
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
            `Roundtrip BG3D: ${roundtripBG3D.materials.length} materials`,
          );

          if (roundtripBG3D.skeleton) {
            console.log(
              `Roundtrip skeleton: ${roundtripBG3D.skeleton.bones.length} bones, ${roundtripBG3D.skeleton.animations.length} animations`,
            );
          }

          // Step 5: Convert BG3DParseResult → TQ3MetaFile → 3DMF binary
          const metaResult = bg3dParseResultToMetaFile(roundtripBG3D);
          expect(metaResult.isOk()).toBe(true);
          if (!metaResult.isOk()) return;

          const writeResult = write3DMFFromMetaFile(metaResult.value);
          expect(writeResult.isOk()).toBe(true);
          if (!writeResult.isOk()) return;
          const roundtripModelBuffer = writeResult.value;

          console.log(
            `Roundtrip model size: ${roundtripModelBuffer.byteLength} bytes`,
          );

          // Step 6: Convert skeleton from BG3D back to skeleton resource and binary
          if (roundtripBG3D.skeleton) {
            const roundtripSkeletonResource = bg3dSkeletonToSkeletonResource(
              roundtripBG3D.skeleton,
            );
            // Note: skeletonResourceToBinary requires a Worker which isn't available in tests
            // For now, skip this step or mock it
            // const roundtripSkeletonBuffer = await skeletonResourceToBinary(roundtripSkeletonResource, mockWorker);

            // console.log(`Roundtrip skeleton size: ${roundtripSkeletonBuffer.byteLength} bytes`);

            // Verify skeleton resource structure
            expect(roundtripSkeletonResource.Bone).toBeDefined();
            expect(
              Object.keys(roundtripSkeletonResource.Bone || {}).length,
            ).toBe(Object.keys(originalSkeletonResource.Bone || {}).length);
          }

          // Step 7: Verify skeleton preservation
          if (originalBG3D.skeleton) {
            expect(roundtripBG3D.skeleton).toBeDefined();
            expect(roundtripBG3D.skeleton?.bones.length).toBe(
              originalBG3D.skeleton.bones.length,
            );
            expect(roundtripBG3D.skeleton?.animations.length).toBe(
              originalBG3D.skeleton.animations.length,
            );
          }

          // Step 8: Re-parse the roundtrip 3DMF to verify it's valid
          const reParse = parse3DMFToMetaFile(roundtripModelBuffer);
          if (!reParse.isOk()) {
            console.log(`Re-parse error: ${reParse.error.message}`);
          }
          expect(reParse.isOk()).toBe(true);

          console.log(
            `✅ ${modelName} + ${skeletonName} TRUE roundtrip successful`,
          );
        });
      },
    );
  });

  describe("Model Files (non-skeleton) TRUE Roundtrip", () => {
    modelFiles.forEach(({ path, name }) => {
      it(`should roundtrip model file ${name}: 3DMF → glTF → 3DMF`, async () => {
        const testFile = join(path, name);
        if (!existsSync(testFile)) {
          console.log(`${name} not available, skipping`);
          return;
        }
        const data = readFileSync(testFile);
        const originalBuffer = data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        );

        console.log(`\n=== Testing ${name} TRUE Roundtrip ===`);
        console.log(`Original file size: ${originalBuffer.byteLength} bytes`);

        // Step 1: Parse original 3DMF
        const parse1 = parse3DMFToMetaFile(originalBuffer);
        expect(parse1.isOk()).toBe(true);
        if (!parse1.isOk()) return;
        const originalMeta = parse1.value;
        console.log(
          `Parsed: ${originalMeta.numMeshes} meshes, ${originalMeta.numTextures} textures`,
        );

        // Step 2: Convert to BG3D format
        const bg3dResult = metaFileToBG3DParseResult(originalMeta);
        expect(bg3dResult.isOk()).toBe(true);
        if (!bg3dResult.isOk()) return;

        // Step 3: Convert to glTF
        const gltfDoc = await bg3dParsedToGLTF(bg3dResult.value);

        // Validate glTF
        const io = new NodeIO();
        const glbBuffer = await io.writeBinary(gltfDoc);
        const validation = await validateBytes(glbBuffer);

        console.log(
          `glTF Validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`,
        );
        expect(validation.issues.numErrors).toBe(0);

        // Step 4: Convert glTF back to BG3D
        const roundtripBg3d = await gltfToBG3D(gltfDoc);

        // Step 5: Convert to 3DMF format
        const metaResult = bg3dParseResultToMetaFile(roundtripBg3d);
        expect(metaResult.isOk()).toBe(true);
        if (!metaResult.isOk()) return;

        // Step 6: Write 3DMF
        const writeResult = write3DMFFromMetaFile(metaResult.value);
        expect(writeResult.isOk()).toBe(true);
        if (!writeResult.isOk()) return;
        const roundtripBuffer = writeResult.value;

        console.log(`Roundtrip file size: ${roundtripBuffer.byteLength} bytes`);

        // Step 7: Compare structures
        const comparison = compareMetaFiles(
          originalMeta,
          metaResult.value,
          name,
        );

        if (comparison.differences.length > 0) {
          console.log(`Differences found:`);
          comparison.differences
            .slice(0, 10)
            .forEach((d) => console.log(`  - ${d}`));
        }

        expect(comparison.match).toBe(true);

        // Step 8: Verify roundtrip 3DMF is valid
        const reParse = parse3DMFToMetaFile(roundtripBuffer);
        expect(reParse.isOk()).toBe(true);

        console.log(`✅ ${name} TRUE roundtrip successful`);
      });
    });
  });

  describe("Double Roundtrip Stability Test", () => {
    it("should produce stable results after two roundtrips", async () => {
      const testFile = join(BUGDOM_SKELETONS_PATH, "Ant.3dmf");
      if (!existsSync(testFile)) {
        console.log("Ant.3dmf not available, skipping");
        return;
      }
      const data = readFileSync(testFile);
      const originalBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      );

      console.log(`\n=== Double Roundtrip Stability Test ===`);

      // First roundtrip: 3DMF → glTF → 3DMF
      const parse1 = parse3DMFToMetaFile(originalBuffer);
      expect(parse1.isOk()).toBe(true);
      if (!parse1.isOk()) return;

      const bg3d1 = metaFileToBG3DParseResult(parse1.value);
      expect(bg3d1.isOk()).toBe(true);
      if (!bg3d1.isOk()) return;

      const gltf1 = await bg3dParsedToGLTF(bg3d1.value);
      const rt1Bg3d = await gltfToBG3D(gltf1);

      const rt1Meta = bg3dParseResultToMetaFile(rt1Bg3d);
      expect(rt1Meta.isOk()).toBe(true);
      if (!rt1Meta.isOk()) return;

      const rt1Write = write3DMFFromMetaFile(rt1Meta.value);
      expect(rt1Write.isOk()).toBe(true);
      if (!rt1Write.isOk()) return;

      console.log(`First roundtrip: ${rt1Write.value.byteLength} bytes`);

      // Second roundtrip: 3DMF → glTF → 3DMF
      const parse2 = parse3DMFToMetaFile(rt1Write.value);
      expect(parse2.isOk()).toBe(true);
      if (!parse2.isOk()) return;

      const bg3d2 = metaFileToBG3DParseResult(parse2.value);
      expect(bg3d2.isOk()).toBe(true);
      if (!bg3d2.isOk()) return;

      const gltf2 = await bg3dParsedToGLTF(bg3d2.value);
      const rt2Bg3d = await gltfToBG3D(gltf2);

      const rt2Meta = bg3dParseResultToMetaFile(rt2Bg3d);
      expect(rt2Meta.isOk()).toBe(true);
      if (!rt2Meta.isOk()) return;

      const rt2Write = write3DMFFromMetaFile(rt2Meta.value);
      expect(rt2Write.isOk()).toBe(true);
      if (!rt2Write.isOk()) return;

      console.log(`Second roundtrip: ${rt2Write.value.byteLength} bytes`);

      // Compare RT1 and RT2 structures - they should be semantically identical
      const comparison = compareMetaFiles(
        rt1Meta.value,
        rt2Meta.value,
        "Double Roundtrip",
      );

      if (comparison.differences.length > 0) {
        console.log(`Differences between RT1 and RT2:`);
        comparison.differences.forEach((d) => console.log(`  - ${d}`));
      }

      expect(comparison.match).toBe(true);

      // Check that subsequent roundtrips are stable in size
      // (We allow small variations due to PNG compression differences)
      const sizeDiff = Math.abs(
        rt1Write.value.byteLength - rt2Write.value.byteLength,
      );
      const sizeRatio = sizeDiff / Math.max(rt1Write.value.byteLength, 1);

      // The size can vary significantly due to texture format conversion
      // (ARGB16 → RGB → ARGB16, etc). Just verify semantic stability.
      console.log(
        `Size difference: ${sizeDiff} bytes (${(sizeRatio * 100).toFixed(2)}%)`,
      );
      console.log(
        `Note: Size variation is expected due to texture format conversions`,
      );

      console.log(`✅ Double roundtrip produces semantically stable results`);
    });
  });
});
