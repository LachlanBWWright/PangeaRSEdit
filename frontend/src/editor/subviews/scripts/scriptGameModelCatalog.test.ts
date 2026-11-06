import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { GAMES } from "@/data/games";
import { Game, OttoGlobals, Nanosaur2Globals, Bugdom2Globals } from "@/data/globals/globals";
import { catalogAssetPath, catalogNativeDefinition, gameModelCatalog, selectedCatalogModel } from "./scriptGameModelCatalog";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { prepareCatalogImport } from "./scriptCatalogImport";
import { buildScriptDefinitionBundle, importScriptDefinitionBundle } from "./scriptDefinitionBundle";

function sample() {
  return loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
}

describe("custom item game model catalog", () => {
  it.each([Game.OTTO_MATIC, Game.BUGDOM, Game.BUGDOM_2, Game.NANOSAUR, Game.NANOSAUR_2, Game.CRO_MAG, Game.BILLY_FRONTIER])("shares the complete Model Viewer catalog for game %s", (game) => {
    const catalog = gameModelCatalog(game);
    expect(catalog.length).toBeGreaterThan(0);
    expect(GAMES.some((entry) => entry.models === catalog)).toBe(true);
  });

  it("offers every global and current-level object, including indices without terrain item mappings", () => {
    const definition = sample().customObjects[0];
    const catalog = gameModelCatalog(Game.OTTO_MATIC);
    const global = catalog.find((entry) => entry.name === "Global");
    const farm = catalog.find((entry) => entry.name === "Level 1 - Farm");
    if (!definition || !global || !farm) return expect.fail("Missing bundled Otto fixtures");
    expect(catalogNativeDefinition(Game.OTTO_MATIC, 0, global, 35, definition)?.visual).toMatchObject({ kind: "nativeDisplayGroup", group: "global", modelObject: 35 });
    expect(catalogNativeDefinition(Game.OTTO_MATIC, 0, farm, 36, definition)?.visual).toMatchObject({ kind: "nativeDisplayGroup", group: "levelSpecific", modelObject: 36 });
    expect(catalogNativeDefinition(Game.OTTO_MATIC, 0, farm, 37, definition)).toBeNull();
    expect(catalogNativeDefinition(Game.OTTO_MATIC, 1, farm, 0, definition)).toBeNull();
  });

  it("resolves skeleton IDs from the native enum, rather than catalog ordering", () => {
    const definition = sample().customObjects[0];
    const onion = gameModelCatalog(Game.OTTO_MATIC).find((entry) => entry.name === "Onion");
    if (!definition || !onion) return expect.fail("Missing Onion fixture");
    expect(catalogNativeDefinition(Game.OTTO_MATIC, 0, onion, 0, definition)?.visual).toMatchObject({ kind: "nativeSkeleton", skeletonType: 3 });
    expect(catalogNativeDefinition(Game.OTTO_MATIC, 1, onion, 0, definition)).toBeNull();
    const selected = catalogNativeDefinition(Game.OTTO_MATIC, 0, onion, 0, definition);
    if (selected) expect(selectedCatalogModel(Game.OTTO_MATIC, 1, selected)).toBe(onion);
  });

  it("uses level metadata when resolving native banks", () => {
    const workspace = loadScriptSample(createScriptWorkspaceContext(Nanosaur2Globals, 0), "hover-beacon");
    const definition = workspace.customObjects[0];
    const desert = gameModelCatalog(Game.NANOSAUR_2).find((entry) => /desert\.bg3d$/i.test(entry.bg3dFile));
    if (!definition || !desert) return expect.fail("Missing desert fixture");
    expect(catalogNativeDefinition(Game.NANOSAUR_2, 0, desert, 0, definition)).toBeNull();
    expect(catalogNativeDefinition(Game.NANOSAUR_2, 0, desert, 0, definition, { "level.biome": "desert" })?.visual.kind).toBe("nativeDisplayGroup");
    const tunnel = loadScriptSample(createScriptWorkspaceContext(Bugdom2Globals, 3), "hover-beacon").customObjects[0];
    const global = gameModelCatalog(Game.BUGDOM_2).find((entry) => /\/global\.bg3d$/i.test(entry.bg3dFile));
    if (!tunnel || !global) return expect.fail("Missing tunnel fixture");
    expect(catalogNativeDefinition(Game.BUGDOM_2, 3, global, 0, tunnel)).toBeNull();
  });

  it("copies an animated catalog asset atomically into an exportable custom skeleton", async () => {
    const workspace = sample();
    const definition = workspace.customObjects[0];
    const onion = gameModelCatalog(Game.OTTO_MATIC).find((entry) => entry.name === "Onion");
    if (!definition || !onion?.skeletonFile) return expect.fail("Missing Onion fixture");
    const assets = await Promise.all([onion.bg3dFile, onion.skeletonFile].map(async (url) => {
      const path = catalogAssetPath(url);
      return { path, sourceName: path.split("/").at(-1) ?? "", bytes: new Uint8Array(await readFile(`public/games/ottomatic/${path.replace("Skeletons/", "skeletons/")}`)) };
    }));
    const prepared = await prepareCatalogImport(workspace, definition, onion, assets, 0);
    expect(prepared.isOk(), prepared.isErr() ? prepared.error : "").toBe(true);
    if (prepared.isErr()) return;
    const copied = prepared.value(workspace);
    expect(copied.customObjects[0]?.visual).toMatchObject({ kind: "customSkeleton", modelPath: "Data/Scripts/assets/skeletons/catalog-onion.bg3d", skeletonPath: "Data/Scripts/assets/skeletons/catalog-onion.skeleton" });
    expect(Object.keys(copied.assets)).toEqual(expect.arrayContaining(["Data/Scripts/assets/skeletons/catalog-onion.bg3d", "Data/Scripts/assets/skeletons/catalog-onion.skeleton.rsrc"]));
    const exported = buildScriptDefinitionBundle(copied);
    expect(exported.isOk()).toBe(true);
    if (exported.isErr()) return;
    const restored = importScriptDefinitionBundle(exported.value, workspace.context);
    expect(restored.isOk(), restored.isErr() ? restored.error : "").toBe(true);
    if (restored.isOk()) {
      expect(restored.value.definitions[0]?.visual).toEqual(copied.customObjects[0]?.visual);
      expect(Object.keys(restored.value.assets)).toEqual(expect.arrayContaining(["Data/Scripts/assets/skeletons/catalog-onion.bg3d", "Data/Scripts/assets/skeletons/catalog-onion.skeleton.rsrc"]));
    }
    const deleted = { ...workspace, customObjects: [] };
    expect(prepared.value(deleted)).toBe(deleted);
    const incomplete = await prepareCatalogImport(workspace, definition, onion, assets.slice(0, 1), 0);
    expect(incomplete.isErr()).toBe(true);
  });
});
