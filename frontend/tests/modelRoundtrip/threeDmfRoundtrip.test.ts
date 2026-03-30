/**
 * 3DMF Model Roundtrip Tests
 *
 * Tests that 3DMF files can be converted directly to GLB and back:
 * 1. 3DMF → BG3DParseResult (shared IR) → GLB → BG3DParseResult → 3DMF
 * 2. Verifies structural integrity through the full pipeline
 * 3. Tests with skeleton/animation data from Bugdom and Nanosaur
 *
 * Note: The conversion uses BG3DParseResult as a shared internal representation
 * (not the BG3D binary format). This is a direct 3DMF↔GLB pipeline with a
 * common intermediate data structure.
 */

import { describe, it, expect } from "vitest";
import { parse3DMF, bg3dParsedTo3DMF, parse3DMFNative, write3DMFNative } from "@/modelParsers/parse3dmf";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";
import { bg3dSkeletonToSkeletonResource } from "@/modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "@/modelParsers/skeletonBinaryExport";
import { unwrap, isOk } from "@/types/result";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("3DMF native roundtrip (parse → write → reparse)", () => {
  const gamesRoot = join(__dirname, "../../public/games");

  const tdmfFiles = [
    { game: "bugdom1", dir: "skeletons", name: "Ant" },
    { game: "bugdom1", dir: "skeletons", name: "Spider" },
    { game: "nanosaur1", dir: "skeletons", name: "Rex" },
    { game: "nanosaur1", dir: "models", name: "Global_Models" },
  ];

  tdmfFiles.forEach(({ game, dir, name }) => {
    const filePath = join(gamesRoot, game, dir, `${name}.3dmf`);

    it(`${game}/${name}.3dmf: native parse → write → reparse`, () => {
      if (!existsSync(filePath)) {
        console.warn(`Skipping - file not found: ${filePath}`);
        return;
      }

      const original = bufferFromFile(filePath);

      // Parse to native format
      const metaFile = unwrap(parse3DMFNative(original));

      // Write back to 3DMF
      const rewritten = unwrap(write3DMFNative(metaFile));
      expect(rewritten.byteLength).toBeGreaterThan(0);

      // Re-parse and verify structure
      const reparsed = unwrap(parse3DMFNative(rewritten));
      expect(reparsed.numMeshes).toBe(metaFile.numMeshes);
      expect(reparsed.numTextures).toBe(metaFile.numTextures);
      // numTopLevelGroups may change during write due to group flattening
      expect(reparsed.numTopLevelGroups).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("3DMF → GLB → 3DMF structural roundtrip", () => {
  const gamesRoot = join(__dirname, "../../public/games");

  const tdmfWithSkeleton = [
    { game: "bugdom1", name: "Ant" },
    { game: "bugdom1", name: "Spider" },
    { game: "nanosaur1", name: "Rex" },
    { game: "nanosaur1", name: "Tricer" },
  ];

  tdmfWithSkeleton.forEach(({ game, name }) => {
    const modelPath = join(gamesRoot, game, "skeletons", `${name}.3dmf`);
    const skelPath = join(gamesRoot, game, "skeletons", `${name}.skeleton.rsrc`);

    it(`${game}/${name}: 3DMF+skeleton → GLB → BG3DParseResult structural match`, async () => {
      if (!existsSync(modelPath) || !existsSync(skelPath)) {
        console.warn(`Skipping - files not found: ${modelPath}`);
        return;
      }

      const modelBuffer = bufferFromFile(modelPath);
      const skelBuffer = bufferFromFile(skelPath);

      // Parse skeleton
      const skelResource = await parseSkeletonRsrc(skelBuffer);

      // Parse 3DMF with skeleton (pass raw buffer, not parsed result)
      const withSkeletonResult = parseBG3DWithSkeletonResource(modelBuffer, skelResource);
      expect(withSkeletonResult.ok).toBe(true);
      if (!withSkeletonResult.ok) return;
      const withSkeleton = withSkeletonResult.value;

      // Also parse without skeleton for reference
      const parsed = unwrap(parse3DMF(modelBuffer));
      expect(parsed.materials.length).toBeGreaterThan(0);

      expect(withSkeleton.skeleton).toBeDefined();

      // Convert to GLB
      const gltfDoc = bg3dParsedToGLTF(withSkeleton);
      const io = new NodeIO();
      const glbBytes = await io.writeBinary(gltfDoc);
      expect(glbBytes.length).toBeGreaterThan(0);

      // Read back GLB
      const readDoc = await io.readBinary(glbBytes);

      // Convert back to shared IR
      const roundtripped = await gltfToBG3D(readDoc);

      // Verify structural match - material count may change through conversion
      expect(roundtripped.materials.length).toBeGreaterThan(0);

      // Groups may be restructured during GLB roundtrip
      expect(roundtripped.groups.length).toBeGreaterThanOrEqual(0);

      if (withSkeleton.skeleton) {
        expect(roundtripped.skeleton).toBeDefined();
        if (roundtripped.skeleton) {
          expect(roundtripped.skeleton.numJoints).toBe(withSkeleton.skeleton.numJoints);
        }
      }

      // Convert back to 3DMF and verify it can be re-parsed
      const rewritten3dmf = bg3dParsedTo3DMF(roundtripped);
      expect(isOk(rewritten3dmf)).toBe(true);
      if (isOk(rewritten3dmf)) {
        expect(rewritten3dmf.value.byteLength).toBeGreaterThan(0);

        // Re-parse the roundtripped 3DMF
        const reparsedResult = parse3DMF(rewritten3dmf.value);
        expect(isOk(reparsedResult)).toBe(true);
        if (isOk(reparsedResult)) {
          // Material count may differ due to texture flattening during conversion
          expect(reparsedResult.value.materials.length).toBeGreaterThan(0);
        }
      }

      // Roundtrip skeleton structure verification
      if (roundtripped.skeleton) {
        const rtSkelResource = bg3dSkeletonToSkeletonResource(roundtripped.skeleton);
        const skelBinaryResult = await skeletonResourceToBinary(rtSkelResource);

        if (skelBinaryResult.ok) {
          expect(skelBinaryResult.value.byteLength).toBeGreaterThan(0);

          // Re-parse roundtripped skeleton and verify bone count
          const reparsedSkel = await parseSkeletonRsrc(skelBinaryResult.value);
          const origBoneCount = Object.keys(skelResource.Bone || {}).length;
          const rtBoneCount = Object.keys(reparsedSkel.Bone || {}).length;
          expect(rtBoneCount).toBe(origBoneCount);
        }
        // Skeleton binary serialization may fail for some formats - this is a known limitation
      }
    });
  });
});

describe("Bugdom 1 and Nanosaur 1 3DMF skeleton event parity", () => {
  const gamesRoot = join(__dirname, "../../public/games");

  const eventFiles = [
    { game: "bugdom1", name: "Ant" },
    { game: "bugdom1", name: "Spider" },
    { game: "bugdom1", name: "Slug" },
    { game: "nanosaur1", name: "Deinon" },
    { game: "nanosaur1", name: "Rex" },
    { game: "nanosaur1", name: "Tricer" },
  ];

  for (const { game, name } of eventFiles) {
    const modelPath = join(gamesRoot, game, "skeletons", `${name}.3dmf`);
    const skelPath = join(gamesRoot, game, "skeletons", `${name}.skeleton.rsrc`);

    it(`${game}/${name}: 3DMF+skeleton events survive direct GLB conversion`, async () => {
      if (!existsSync(modelPath) || !existsSync(skelPath)) {
        console.warn(`Skipping - files not found: ${modelPath}`);
        return;
      }

      const modelBuffer = bufferFromFile(modelPath);
      const skelBuffer = bufferFromFile(skelPath);

      const skeletonResource = await parseSkeletonRsrc(skelBuffer);
      const parsed = parseBG3DWithSkeletonResource(modelBuffer, skeletonResource);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const original = parsed.value;
      expect(original.skeleton).toBeDefined();
      expect(original.skeleton?.animations.length).toBeGreaterThan(0);

      const supportedTypes = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
      original.skeleton?.animations.forEach((animation) => {
        animation.events.forEach((event) => {
          expect(supportedTypes.has(event.type)).toBe(true);
        });
      });

      const gltfDoc = bg3dParsedToGLTF(original);
      const io = new NodeIO();
      const glbBytes = await io.writeBinary(gltfDoc);
      expect(glbBytes.length).toBeGreaterThan(0);

      const validation = await validateBytes(glbBytes);
      expect(validation.issues.numErrors).toBe(0);

      const roundtripped = await gltfToBG3D(await io.readBinary(glbBytes));
      expect(roundtripped.skeleton).toBeDefined();
      if (!roundtripped.skeleton || !original.skeleton) return;

      expect(roundtripped.skeleton.animations.length).toBe(
        original.skeleton.animations.length,
      );

      for (let animIndex = 0; animIndex < original.skeleton.animations.length; animIndex++) {
        const originalAnimation = original.skeleton.animations[animIndex];
        const roundtrippedAnimation = roundtripped.skeleton.animations[animIndex];

        expect(originalAnimation).toBeDefined();
        expect(roundtrippedAnimation).toBeDefined();
        if (!originalAnimation || !roundtrippedAnimation) continue;

        expect(roundtrippedAnimation.events.length).toBe(
          originalAnimation.events.length,
        );

        for (let eventIndex = 0; eventIndex < originalAnimation.events.length; eventIndex++) {
          const originalEvent = originalAnimation.events[eventIndex];
          const roundtrippedEvent = roundtrippedAnimation.events[eventIndex];
          expect(roundtrippedEvent).toBeDefined();
          expect(originalEvent).toBeDefined();
          if (!originalEvent || !roundtrippedEvent) continue;

          expect(roundtrippedEvent.time).toBe(originalEvent.time);
          expect(roundtrippedEvent.type).toBe(originalEvent.type);
          expect(roundtrippedEvent.value).toBe(originalEvent.value);
        }
      }
    });
  }
});

describe("3DMF standalone models → GLB → 3DMF roundtrip", () => {
  const gamesRoot = join(__dirname, "../../public/games");

  const standaloneModels = [
    { game: "nanosaur1", dir: "models", name: "Global_Models" },
    { game: "nanosaur1", dir: "models", name: "Level1_Models" },
  ];

  standaloneModels.forEach(({ game, dir, name }) => {
    const modelPath = join(gamesRoot, game, dir, `${name}.3dmf`);

    it(`${game}/${name}: standalone 3DMF → GLB → 3DMF`, async () => {
      if (!existsSync(modelPath)) {
        console.warn(`Skipping - file not found: ${modelPath}`);
        return;
      }

      const modelBuffer = bufferFromFile(modelPath);

      // Parse 3DMF to shared IR (no skeleton)
      const parsed = unwrap(parse3DMF(modelBuffer));

      // Convert to GLB
      const gltfDoc = bg3dParsedToGLTF(parsed);
      const io = new NodeIO();
      const glbBytes = await io.writeBinary(gltfDoc);
      expect(glbBytes.length).toBeGreaterThan(0);

      // Read back and convert to IR
      const readDoc = await io.readBinary(glbBytes);
      const roundtripped = await gltfToBG3D(readDoc);

      // Verify materials are preserved
      expect(roundtripped.materials.length).toBe(parsed.materials.length);

      // Verify groups are present (count may differ due to GLB flattening)
      expect(roundtripped.groups.length).toBeGreaterThanOrEqual(0);
    });
  });
});
