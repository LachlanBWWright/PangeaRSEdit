import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, expect, it } from "vitest";
import { readGltf } from "@pangea/model-codec/node";
import { EditorAssets } from "../src/editorAssets.ts";
import type { GameId } from "@pangea/desktop-contracts";

const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

it("derives and caches an animated home preview from downloaded Otto stock data", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pangea-native-preview-"));
  temporary.push(root);
  const dataRoot = path.join(root, "original", "Data");
  const skeletons = path.join(dataRoot, "Skeletons");
  await fs.mkdir(skeletons, { recursive: true });
  const source = path.resolve("../games/pangea-ports/games/OttoMatic-Android/Data/Skeletons");
  for (const name of ["Otto.bg3d", "Otto.skeleton.rsrc"]) await fs.copyFile(path.join(source, name), path.join(skeletons, name));
  const assets = new EditorAssets(root);
  const registered = await assets.register("OttoMatic", "original", path.dirname(dataRoot), {
    source: "upstream", dataRoot, releaseUrl: "https://example.com/original.zip",
  });
  expect(registered.isOk()).toBe(true);
  const [preview, concurrent] = await Promise.all([assets.resolve("glbModels/OttoMatic.glb"), assets.resolve("glbModels/OttoMatic.glb")]);
  expect(preview).toBeTruthy();
  expect(concurrent).toBe(preview);
  if (!preview) return;
  const decoded = await readGltf(preview);
  expect(decoded.isErr() ? decoded.error : null).toBeNull();
  if (decoded.isErr()) return;
  expect(decoded.value.getRoot().listMeshes().length).toBeGreaterThan(0);
  expect(decoded.value.getRoot().listSkins().length).toBeGreaterThan(0);
  expect(decoded.value.getRoot().listAnimations().length).toBeGreaterThan(0);
  expect(await assets.resolve("glbModels/Bugdom1.glb")).toBeNull();
  const next = new Date(Date.now() + 2000);
  await fs.utimes(path.join(skeletons, "Otto.skeleton.rsrc"), next, next);
  expect(await assets.resolve("glbModels/OttoMatic.glb")).toBe(preview);
  await assets.remove("OttoMatic");
  expect(await assets.resolve("glbModels/OttoMatic.glb")).toBeNull();
}, 60_000);

it.each([
  ["OttoMatic", "OttoMatic-Android", "OttoMatic.glb"],
  ["Bugdom", "Bugdom-android", "Bugdom1.glb"],
  ["Bugdom2", "Bugdom2-Android", "Bugdom2.glb"],
  ["Nanosaur", "Nanosaur-android", "Nanosaur1.glb"],
  ["Nanosaur2", "Nanosaur2-Android", "Nanosaur2.glb"],
  ["CroMagRally", "CroMagRally-Android", "CroMag.glb"],
  ["BillyFrontier", "BillyFrontier-Android", "BillyFrontier.glb"],
] satisfies [GameId, string, string][])("builds the %s home model from its original native format", async (game, port, filename) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pangea-game-preview-"));
  temporary.push(root);
  const assets = new EditorAssets(root);
  let dataRoot = path.resolve(`../games/pangea-ports/games/${port}/Data`);
  if (game === "BillyFrontier") {
    const original = path.join(dataRoot, "Skeletons");
    dataRoot = path.join(root, "Data");
    await fs.mkdir(path.join(dataRoot, "Skeletons"), { recursive: true });
    await fs.copyFile(path.join(original, "Billy.bg3d"), path.join(dataRoot, "Skeletons/Billy.bg3"));
    await fs.copyFile(path.join(original, "Billy.skeleton.rsrc"), path.join(dataRoot, "Skeletons/Billy.skeleton.rsrc"));
  }
  expect((await assets.register(game, "original", path.dirname(dataRoot), {
    source: "upstream", dataRoot, releaseUrl: "https://example.com/original.zip",
  })).isOk()).toBe(true);
  const preview = await assets.resolve(`glbModels/${filename}`);
  expect(preview).not.toBeNull();
  if (!preview) return;
  const decoded = await readGltf(preview);
  expect(decoded.isErr() ? decoded.error : null).toBeNull();
  if (decoded.isErr()) return;
  expect(decoded.value.getRoot().listMeshes().length).toBeGreaterThan(0);
  expect(decoded.value.getRoot().listAnimations().length).toBeGreaterThan(0);
}, 60_000);
