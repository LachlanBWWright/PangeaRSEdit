import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Document, WebIO } from "@gltf-transform/core";
import { bg3dParsedToBG3D, parseBG3D } from "@/modelParsers/parseBG3D";
import type { BG3DGeometry, BG3DGroup } from "@/modelParsers/parseBG3D";
import {
  validateUploadedScriptAsset,
  validateUploadedScriptAssetAsync,
  validateParsedNativeModel,
  validateScriptPackageAssets,
  validateScriptWorkspaceAssetsAsync,
} from "./scriptAssetValidation";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";

const skeletonFixtures = [
  ["Otto Matic", "../../../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc"],
  ["Bugdom", "../../../../public/games/bugdom1/skeletons/FireFly.skeleton.rsrc"],
  ["Bugdom 2", "../../../../public/games/bugdom2/skeletons/EvilPlant.skeleton.rsrc"],
  ["Cro-Mag Rally", "../../../../public/games/cromagrally/skeletons/Flower.skeleton.rsrc"],
  ["Nanosaur", "../../../../public/games/nanosaur1/skeletons/Rex.skeleton.rsrc"],
  ["Nanosaur 2", "../../../../public/games/nanosaur2/skeletons/nano.skeleton.rsrc"],
  ["Billy Frontier", "../../../../public/games/billyfrontier/skeletons/Billy.skeleton.rsrc"],
] satisfies readonly (readonly [string, string])[];

const bg3dFixtures = [
  ["Otto Matic", "../../../../public/games/ottomatic/skeletons/GiantLizard.bg3d"],
  ["Bugdom 2", "../../../../public/games/bugdom2/skeletons/Mouse.bg3d"],
  ["Cro-Mag Rally", "../../../../public/games/cromagrally/skeletons/GragStanding.bg3d"],
  ["Nanosaur 2", "../../../../public/games/nanosaur2/skeletons/bonusworm.bg3d"],
  ["Billy Frontier", "../../../../public/games/billyfrontier/skeletons/Rygar.bg3d"],
] satisfies readonly (readonly [string, string])[];

const productionAssetFixtures = [
  ["OttoMatic-Android", "skeleton", "../../../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc"],
  ["Bugdom-android", "3dmf", "../../../../public/games/bugdom1/skeletons/FireFly.3dmf"],
  ["Bugdom2-Android", "bg3d", "../../../../public/games/bugdom2/skeletons/Mouse.bg3d"],
  ["Nanosaur-android", "3dmf", "../../../../public/games/nanosaur1/skeletons/Rex.3dmf"],
  ["Nanosaur2-Android", "bg3d", "../../../../public/games/nanosaur2/skeletons/bonusworm.bg3d"],
  ["CroMagRally-Android", "bg3d", "../../../../public/games/cromagrally/skeletons/GragStanding.bg3d"],
  ["BillyFrontier-Android", "skeleton", "../../../../public/games/billyfrontier/skeletons/Billy.skeleton.rsrc"],
  ["MightyMike-Android", "shapes", "../../../../public/data/mightymike/shapes/main.shapes"],
] satisfies readonly (readonly [string, "bg3d" | "3dmf" | "skeleton" | "shapes", string])[];

const pairedSkeletonFixtures = [
  ["OttoMatic-Android", "ottomatic", "Blob.bg3d", "Blob.skeleton.rsrc"],
  ["Bugdom-android", "bugdom1", "FireFly.3dmf", "FireFly.skeleton.rsrc"],
  ["Bugdom2-Android", "bugdom2", "Mouse.bg3d", "Mouse.skeleton.rsrc"],
  ["Nanosaur-android", "nanosaur1", "Rex.3dmf", "Rex.skeleton.rsrc"],
  ["Nanosaur2-Android", "nanosaur2", "bonusworm.bg3d", "bonusworm.skeleton.rsrc"],
  ["CroMagRally-Android", "cromagrally", "GragStanding.bg3d", "GragStanding.skeleton.rsrc"],
  ["BillyFrontier-Android", "billyfrontier", "Billy.bg3d", "Billy.skeleton.rsrc"],
] satisfies readonly (readonly [string, string, string, string])[];

function readFixture(relativePath: string): Uint8Array {
  return new Uint8Array(readFileSync(join(__dirname, relativePath)));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function createTriangleGlb(): Promise<Uint8Array> {
  const document = new Document();
  const buffer = document.createBuffer();
  const primitive = document
    .createPrimitive()
    .setAttribute(
      "POSITION",
      document
        .createAccessor()
        .setType("VEC3")
        .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
        .setBuffer(buffer),
    );
  const mesh = document.createMesh().addPrimitive(primitive);
  const node = document.createNode().setMesh(mesh);
  const scene = document.createScene().addChild(node);
  document.getRoot().setDefaultScene(scene);
  return new Uint8Array(await new WebIO().writeBinary(document));
}

describe("script asset validation against bundled game fixtures", () => {
  it("validates the generated native bytes during glTF preflight", async () => {
    const result = await validateUploadedScriptAssetAsync(
      "Data/Scripts/assets/models/converted.glb",
      await createTriangleGlb(),
    );
    expect(result.isOk()).toBe(true);
  });

  it.each(productionAssetFixtures)("validates a production asset fixture for %s", async (gameId, kind, relativePath) => {
    const path = kind === "shapes"
      ? "Data/Scripts/assets/shapes/production-fixture.shapes"
      : kind === "bg3d"
        ? "Data/Scripts/assets/models/production-fixture.bg3d"
        : kind === "3dmf"
          ? "Data/Scripts/assets/models/production-fixture.3dmf"
          : "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc";
    const result = kind === "skeleton"
      ? await validateUploadedScriptAssetAsync(path, readFixture(relativePath))
      : validateUploadedScriptAsset(path, readFixture(relativePath));
    expect(result.isOk(), `${gameId} production ${kind} fixture should validate`).toBe(true);
  });

  it("rejects native geometry that references an unavailable material", () => {
    const source = parseBG3D(
      toArrayBuffer(readFixture("../../../../public/games/bugdom2/skeletons/Mouse.bg3d")),
    );
    expect(source.isOk()).toBe(true);
    if (source.isErr()) return;
    const findGeometry = (group: BG3DGroup): BG3DGeometry | undefined => {
      for (const child of group.children) {
        if ("children" in child) {
          const nested = findGeometry(child);
          if (nested) return nested;
          continue;
        }
        return child;
      }
      return undefined;
    };
    const geometry = source.value.groups
      .map(findGeometry)
      .find((candidate) => candidate !== undefined);
    expect(geometry).toBeDefined();
    if (!geometry) return;
    geometry.layerMaterialNum = [source.value.materials.length + 1];

    const result = validateUploadedScriptAsset(
      "Data/Scripts/assets/models/invalid-material.bg3d",
      new Uint8Array(bg3dParsedToBG3D(source.value)),
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toContain("invalid material index");
    }
  });

  it("rejects native textures whose declared byte size is inconsistent", () => {
    const source = parseBG3D(
      toArrayBuffer(readFixture("../../../../public/games/bugdom2/skeletons/Mouse.bg3d")),
    );
    expect(source.isOk()).toBe(true);
    if (source.isErr()) return;
    const texture = source.value.materials[0]?.textures[0];
    expect(texture).toBeDefined();
    if (!texture) return;
    texture.bufferSize += 1;

    const errors = validateParsedNativeModel(
      source.value,
      "Data/Scripts/assets/models/invalid-texture.bg3d",
    );
    expect(errors.join("; ")).toContain("texture byte length");
  });

  it.each(pairedSkeletonFixtures)("validates compatible model and skeleton metadata for %s", async (gameId, gameFolder, modelFile, skeletonFile) => {
    const modelPath = `Data/Scripts/assets/skeletons/${modelFile}`;
    const skeletonPath = `Data/Scripts/assets/skeletons/${skeletonFile.replace(/\.rsrc$/, "")}`;
    const definition = {
      id: `custom.${gameId.toLowerCase()}.paired-skeleton`,
      label: `${gameId} paired skeleton`,
      sourceFilePath: "Data/Scripts/src/objects/paired-skeleton.lua",
      exportName: "pairedSkeleton",
      tags: [],
      compatibility: "extended-only",
      description: "Production model and skeleton compatibility fixture.",
      visual: {
        kind: "customSkeleton",
        modelPath,
        skeletonPath,
        animations: { idle: 0 },
        initialAnimation: "idle",
        animationSpeed: 1,
        scale: 1,
        slot: 450,
      },
      collision: { kind: "none" },
    } satisfies ScriptCustomObjectDefinition;
    const result = await validateScriptWorkspaceAssetsAsync({
      customObjects: [definition],
      assets: {
        [modelPath]: {
          path: modelPath,
          bytes: readFixture(`../../../../public/games/${gameFolder}/skeletons/${modelFile}`),
          sourceName: modelFile,
        },
        [`${skeletonPath}.rsrc`]: {
          path: `${skeletonPath}.rsrc`,
          bytes: readFixture(`../../../../public/games/${gameFolder}/skeletons/${skeletonFile}`),
          sourceName: skeletonFile,
        },
      },
    });
    expect(result.isOk(), `${gameId} model/skeleton metadata should agree`).toBe(true);
  });

  it.each(skeletonFixtures)("accepts the %s skeleton resource", async (game, relativePath) => {
    const result = await validateUploadedScriptAssetAsync(
      `Data/Scripts/assets/skeletons/${game.toLowerCase().replaceAll(" ", "-")}.skeleton.rsrc`,
      readFixture(relativePath),
    );
    expect(result.isOk()).toBe(true);
  });

  it.each(bg3dFixtures)("accepts the %s BG3D model", (game, relativePath) => {
    const result = validateUploadedScriptAsset(
      `Data/Scripts/assets/models/${game.toLowerCase().replaceAll(" ", "-")}.bg3d`,
      readFixture(relativePath),
    );
    expect(result.isOk()).toBe(true);
  });

  it("accepts the bundled Mighty Mike Shapes pipeline fixture", () => {
    const result = validateUploadedScriptAsset(
      "Data/Scripts/assets/shapes/mighty-mike-main.shapes",
      readFixture("../../../../public/data/mightymike/shapes/main.shapes"),
    );
    expect(result.isOk()).toBe(true);
  });

  it("requires asynchronous preflight for skeleton package assets", () => {
    const result = validateScriptPackageAssets({
      "Data/Scripts/assets/skeletons/fixture.skeleton.rsrc": readFixture(
        "../../../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc",
      ),
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toContain("asynchronous validation preflight");
    }
  });

  it("rejects custom skeleton animation mappings outside the parsed animation table", async () => {
    const modelPath = "Data/Scripts/assets/skeletons/fixture.bg3d";
    const skeletonPath = "Data/Scripts/assets/skeletons/fixture.skeleton";
    const definition = {
      id: "custom.invalid-animation",
      label: "Invalid Animation Fixture",
      sourceFilePath: "Data/Scripts/src/objects/invalid-animation.lua",
      exportName: "invalidAnimation",
      tags: [],
      compatibility: "extended-only",
      description: "Fixture for skeleton animation validation.",
      visual: {
        kind: "customSkeleton",
        modelPath,
        skeletonPath,
        animations: { missing: 9999 },
        initialAnimation: "idle",
        animationSpeed: 1,
        scale: 1,
        slot: 450,
      },
      collision: { kind: "none" },
    } satisfies ScriptCustomObjectDefinition;
    const result = await validateScriptWorkspaceAssetsAsync({
      customObjects: [definition],
      assets: {
        [modelPath]: {
          path: modelPath,
          bytes: readFixture("../../../../public/games/ottomatic/skeletons/GiantLizard.bg3d"),
          sourceName: "GiantLizard.bg3d",
        },
        [`${skeletonPath}.rsrc`]: {
          path: `${skeletonPath}.rsrc`,
          bytes: readFixture("../../../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc"),
          sourceName: "Blob.skeleton.rsrc",
        },
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toContain("maps animation 'missing'");
      expect(result.error).toContain("missing initial animation 'idle'");
    }
  });
});
