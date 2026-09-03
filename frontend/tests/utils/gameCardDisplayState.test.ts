import { describe, expect, it } from "vitest";
import { DataType, Game } from "@/data/globals/globals";
import {
  formatTypeList,
  getGameCardModelPath,
  getLevelFileType,
  getSupportedUploadTypes,
  getTextureFileType,
} from "@/editor/gameCards/gameCardDisplayState";

describe("game card display state", () => {
  it.each([
    [Game.OTTO_MATIC, "/glbModels/OttoMatic.glb"],
    [Game.BUGDOM, "/glbModels/Bugdom1.glb"],
    [Game.BUGDOM_2, "/glbModels/Bugdom2.glb"],
    [Game.CRO_MAG, "/glbModels/CroMag.glb"],
    [Game.NANOSAUR, "/glbModels/Nanosaur1.glb"],
    [Game.NANOSAUR_2, "/glbModels/Nanosaur2.glb"],
    [Game.BILLY_FRONTIER, "/glbModels/BillyFrontier.glb"],
    [Game.MIGHTY_MIKE, undefined],
  ])("maps game %s to its card model", (game, expected) => {
    expect(getGameCardModelPath(game)).toBe(expected);
  });

  it("derives level and texture extensions for each format family", () => {
    expect(getLevelFileType(true, DataType.STANDARD)).toBe(".map");
    expect(getLevelFileType(false, DataType.TRT_FILE)).toBe(".ter");
    expect(getLevelFileType(false, DataType.STANDARD)).toBe(".ter.rsrc");
    expect(getTextureFileType(true, false, false)).toBe(".tileset");
    expect(getTextureFileType(false, true, false)).toBeNull();
    expect(getTextureFileType(false, false, true)).toBe(".trt");
    expect(getTextureFileType(false, false, false)).toBe(".ter");
  });

  it("constructs supported upload lists without null entries", () => {
    expect(getSupportedUploadTypes(".ter.rsrc", ".ter", false)).toEqual([".ter.rsrc", ".ter"]);
    expect(getSupportedUploadTypes(".ter.rsrc", null, true)).toEqual([".ter.rsrc", ".tun"]);
  });

  it.each([
    [[], ""],
    [[".map"], ".map"],
    [[".ter", ".trt"], ".ter or .trt"],
    [["a", "b", "c"], "a, b or c"],
  ])("formats %j as a readable list", (types, expected) => {
    expect(formatTypeList(types)).toBe(expected);
  });
});
