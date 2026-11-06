import { createStore } from "jotai";
import { expect, it } from "vitest";
import { CroMagGlobals, BillyFrontierGlobals, Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { GAME_PORT_CONFIGS, inferPreviewLevelFromFilename } from "@/editor/utils/gamePortConfig";
import { knownBaseLevel, rememberBaseLevel } from "@/editor/utils/previewLevelNumbers";
import { createScriptWorkspaceContext } from "./scriptWorkspaceState";
import { scriptLevelNumberAtom } from "./scriptLevelNumber";

it("uses native Cro-Mag script indices while preserving track numbers for native models and preview launch", () => {
  const store = createStore();
  store.set(Globals, CroMagGlobals);
  for (const track of [1, 3, 17]) {
    store.set(LevelNumber, track);
    const level = store.get(scriptLevelNumberAtom) ?? null;
    const context = createScriptWorkspaceContext(CroMagGlobals, level);
    expect(context.levelKey).toBe(String(track-1));
    expect(store.get(LevelNumber)).toBe(track);
    expect(GAME_PORT_CONFIGS[CroMagGlobals.GAME_TYPE].buildLaunchQuery(track).get("track")).toBe(String(track));
  }
  store.set(Globals, BillyFrontierGlobals);
  store.set(LevelNumber, 1);
  expect(store.get(scriptLevelNumberAtom)).toBe(1);
  store.set(LevelNumber, undefined);
  expect(store.get(scriptLevelNumberAtom)).toBeUndefined();
});

it("retains the base area of a renamed sample whose filename cannot identify its native level", () => {
  const file = rememberBaseLevel(new File([], "billy-gallery.ter.rsrc"), 1);
  expect(inferPreviewLevelFromFilename(BillyFrontierGlobals.GAME_TYPE, file.name)).toBeUndefined();
  expect(knownBaseLevel(file)).toBe(1);
  expect(knownBaseLevel(new File([], file.name))).toBeUndefined();
});
