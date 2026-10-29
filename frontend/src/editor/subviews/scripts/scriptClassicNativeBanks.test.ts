import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { parseShapesFile } from "@/parsers/mightyMikeShapesParser";
import { parse3DMFNative } from "../../../../../packages/model-codec/src/modelParsers/parse3dmf";
import { parseSkeletonRsrcResult } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { CLASSIC_NATIVE_MODEL_COUNTS, CLASSIC_NATIVE_SKELETON_ANIMATIONS, getClassicNativeBank, getClassicSkeletonBank, isClassicNativeLevel, MIKE_NATIVE_ANIMATIONS } from "./scriptClassicNativeBanks";

describe("classic native banks", () => {
  it("maps each Bugdom area to its real terrain family", () => {
    const expected = ["Lawn", "Lawn", "Pond", "Forest", "Forest", "BeeHive", "BeeHive", "Night", "AntHill", "AntHill"];
    expected.forEach((family, level) => {
      expect(getClassicNativeBank(Game.BUGDOM, "levelSpecific", level)).toContain(family);
      expect(getClassicNativeBank(Game.BUGDOM, "levelSpecific2", level)).toBe(level < 2 ? "Lawn_Models2.3dmf" : null);
      expect(getClassicSkeletonBank(Game.BUGDOM, 1, level)).toBe("DoodleBug");
    });
    expect(getClassicSkeletonBank(Game.BUGDOM, 16, 8)).toBeNull();
    expect(getClassicSkeletonBank(Game.BUGDOM, 16, 9)).toBe("AntKing");
    expect(getClassicSkeletonBank(Game.BUGDOM, 0, 2)).toBeNull();
    expect(getClassicSkeletonBank(Game.BUGDOM, 0, 0)).toBe("BoxerFly");
  });

  it("checks Nanosaur's single bank and all six loaded skeletons", () => {
    expect(getClassicNativeBank(Game.NANOSAUR, "levelSpecific", 0)).toBe("Level1_Models.3dmf");
    expect(getClassicNativeBank(Game.NANOSAUR, "global2", 0)).toBeNull();
    for (let type = 0; type < 6; type++) expect(getClassicSkeletonBank(Game.NANOSAUR, type, 0)).not.toBeNull();
    expect(getClassicSkeletonBank(Game.NANOSAUR, 6, 0)).toBeNull();
    expect(isClassicNativeLevel(Game.NANOSAUR, 1)).toBe(false);
  });

  it("maps all fifteen Mike levels and refuses skeletons", () => {
    const scenes = ["jurassic", "candy", "fairy", "clown", "bargain"];
    for (let level = 0; level < 15; level++) {
      expect(getClassicNativeBank(Game.MIGHTY_MIKE, "levelSpecific", level)).toBe(`${scenes[Math.floor(level / 3)]}1.shapes`);
      expect(getClassicNativeBank(Game.MIGHTY_MIKE, "levelSpecific2", level)).toBe(`${scenes[Math.floor(level / 3)]}2.shapes`);
      expect(getClassicSkeletonBank(Game.MIGHTY_MIKE, 0, level)).toBeNull();
    }
    expect(isClassicNativeLevel(Game.MIGHTY_MIKE, 15)).toBe(false);
    expect(isClassicNativeLevel(Game.BUGDOM, -1)).toBe(false);
    expect(isClassicNativeLevel(Game.BUGDOM, 1.5)).toBe(false);
  });

  it.each(Object.entries(MIKE_NATIVE_ANIMATIONS))("matches bundled shape and animation bounds for %s", (bank, counts) => {
    const file = resolve(__dirname, "../../../../../games/pangea-ports/games/MightyMike-Android/Data/Shapes", bank);
    const bytes = Result.fromThrowable(() => readFileSync(file), String)();
    expect(bytes.isOk()).toBe(true);
    if (bytes.isErr()) return;
    const data = bytes.value;
    const parsed = parseShapesFile(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    expect(parsed.value.shapes.map((shape) => shape.animations.length)).toEqual(counts);
  });

  it.each(Object.entries(CLASSIC_NATIVE_MODEL_COUNTS))("matches the actual native 3DMF group count for %s", (bank, count) => {
    const game = ["Global_Models.3dmf", "Level1_Models.3dmf"].includes(bank) ? "nanosaur1" : "bugdom1";
    const file = resolve(__dirname, "../../../../public/games", game, "models", bank);
    const bytes = Result.fromThrowable(() => readFileSync(file), String)();
    expect(bytes.isOk()).toBe(true);
    if (bytes.isErr()) return;
    const data = bytes.value;
    const parsed = parse3DMFNative(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    expect(parsed.value.topLevelGroups.length).toBe(count);
  });

  it.each(Object.entries(CLASSIC_NATIVE_SKELETON_ANIMATIONS))("matches the actual skeleton animation count for %s", async (bank, count) => {
    const game = ["Ptera", "Rex", "Stego", "Deinon", "Tricer", "Diloph"].includes(bank) ? "nanosaur1" : "bugdom1";
    const file = resolve(__dirname, "../../../../public/games", game, "skeletons", `${bank}.skeleton.rsrc`);
    const bytes = Result.fromThrowable(() => readFileSync(file), String)();
    expect(bytes.isOk()).toBe(true);
    if (bytes.isErr()) return;
    const data = bytes.value;
    const parsed = await parseSkeletonRsrcResult(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    expect(parsed.value.Hedr["1000"]?.obj.numAnims).toBe(count);
  });
});
