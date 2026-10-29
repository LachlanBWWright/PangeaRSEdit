import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Game, OttoGlobals } from "@/data/globals/globals";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parse3DMF } from "@/modelParsers/parse3dmf";
import { parseShapesFile } from "@/parsers/mightyMikeShapesParser";
import { createScriptWorkspaceContext, loadScriptSample } from "../scripts/scriptWorkspaceState";
import { customThumbnailSource } from "./customItemThumbnailSource";

const original = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon").customObjects[0];
const games = [
  [Game.OTTO_MATIC, "ottomatic"], [Game.BUGDOM, "bugdom1"], [Game.BUGDOM_2, "bugdom2"],
  [Game.NANOSAUR, "nanosaur1"], [Game.NANOSAUR_2, "nanosaur2"], [Game.CRO_MAG, "cromagrally"],
  [Game.BILLY_FRONTIER, "billyfrontier"], [Game.MIGHTY_MIKE, "mightymike"],
] satisfies readonly (readonly [Game, string])[];

describe("configured custom item thumbnail sources", () => {
  it.each(games)("uses an actual bundled model for game %s", (game, folder) => {
    if (!original) return;
    const source = customThumbnailSource(game, 0, { ...original, visual: { kind: "nativeDisplayGroup", group: "global", modelObject: 1, scale: 1, slot: 450 } });
    expect(source).not.toBeNull();
    if (!source) return;
    expect(source.modelObject).toBe(1);
    const path = source.modelPath.replace(/^[^/]+/, (directory) => directory.toLowerCase());
    const file = resolve(__dirname, "../../../../public", game === Game.MIGHTY_MIKE ? `data/mightymike/${path}` : `games/${folder}/${path}`);
    const bytes = Uint8Array.from(readFileSync(file)).buffer;
    const parsed = file.endsWith(".shapes") ? parseShapesFile(bytes) : file.endsWith(".3dmf") ? parse3DMF(bytes) : parseBG3D(bytes);
    expect(parsed.isOk()).toBe(true);
  });

  it("selects model banks from edited level metadata", () => {
    if (!original) return;
    const definition = { ...original, visual: { kind: "nativeDisplayGroup", group: "levelSpecific", modelObject: 0, scale: 1, slot: 450 } } satisfies typeof original;
    expect(customThumbnailSource(Game.NANOSAUR_2, 0, definition, { "level.biome": "swamp" })?.modelPath).toBe("Models/swamp.bg3d");
    expect(customThumbnailSource(Game.BILLY_FRONTIER, 0, definition, { "area.mode": "target-practice" })?.modelPath).toBe("Models/targetpractice.bg3d");
  });

  it("preserves uploaded model index and skeleton animation identity", () => {
    if (!original) return;
    const visual = { kind: "customSkeleton", modelPath: "Data/Scripts/assets/skeletons/model.bg3d", skeletonPath: "Data/Scripts/assets/skeletons/model.skeleton", animations: { idle: 2 }, initialAnimation: "idle", animationSpeed: 1, scale: 2, slot: 450 } satisfies typeof original.visual;
    expect(customThumbnailSource(Game.OTTO_MATIC, 0, { ...original, visual })).toEqual({ modelPath: visual.modelPath, skeletonPath: visual.skeletonPath, animation: 2, scale: 2, modelObject: 0 });
  });
});
