import * as fs from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { GAME_ASSET_CATALOG, gameIdSchema } from "@pangea/desktop-contracts";
import { ResultAsync } from "neverthrow";
import { getFenceImagePath } from "@/data/fences/getFenceImagePath";
import { OttoGlobals, BugdomGlobals, Bugdom2Globals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals } from "@/data/globals/globals";
import { getLiquidTextureSource } from "@/editor/subviews/water/useGameLiquidTexture";
import { getItemLiquidTextureSource } from "@/editor/subviews/items/useItemLiquidTexture";
import { Game } from "@/data/globals/globals";
import { fenceTypeNames as ottoFences } from "@/data/fences/ottoFenceType";
import { fenceTypeNames as bugdomFences } from "@/data/fences/bugdomFenceType";
import { fenceTypeNames as bugdom2Fences } from "@/data/fences/bugdom2FenceType";
import { fenceTypeNames as nanosaur2Fences } from "@/data/fences/nanosaur2FenceType";

vi.mock("@/platform/desktop/client", () => ({ desktopBridge: () => true }));

async function exists(url: string) {
  const relative = url.split("?")[0] ?? "";
  const [, name, native] = /game-assets\/([^/]+)\/Data\/(.*)/.exec(relative) ?? [];
  const game = gameIdSchema.safeParse(name);
  expect(game.success, url).toBe(true);
  if (!game.success || !native) return;
  const filename = path.resolve(`../games/pangea-ports/games/${GAME_ASSET_CATALOG[game.data].port}/Data/${native}`);
  const file = await ResultAsync.fromPromise(fs.stat(filename), () => `Missing ${filename}`);
  expect(file.isErr() ? file.error : null, url).toBeNull();
  expect(file.isOk() && file.value.isFile(), url).toBe(true);
}

it.each([
  [OttoGlobals, Object.keys(ottoFences).length], [BugdomGlobals, Object.keys(bugdomFences).length],
  [Bugdom2Globals, Object.keys(bugdom2Fences).length], [Nanosaur2Globals, Object.keys(nanosaur2Fences).length],
  [CroMagGlobals, 27], [BillyFrontierGlobals, 7],
] satisfies [typeof OttoGlobals, number][])("resolves the native fence images for %o", async (globals, count) => {
  for (let type = 0; type < count; type++) await exists(getFenceImagePath(globals, type));
});

it.each([
  [Game.OTTO_MATIC, 8], [Game.BUGDOM_2, 3], [Game.NANOSAUR_2, 10],
  [Game.BILLY_FRONTIER, 3], [Game.CRO_MAG, 1],
])("resolves every liquid source for game %s", async (game, count) => {
  for (let type = 0; type < count; type++) {
    const source = getLiquidTextureSource(game, type);
    expect(source).not.toBeNull();
    if (source) await exists(source.url);
  }
});

it("resolves native Bugdom and Nanosaur item liquid sources", async () => {
  for (const type of [14, 27, 55, 56]) {
    const source = getItemLiquidTextureSource(Game.BUGDOM, type);
    if (source) await exists(source.url);
  }
  for (const type of [4, 14]) {
    const source = getItemLiquidTextureSource(Game.NANOSAUR, type);
    expect(source?.format).toBe("model");
    if (source) await exists(source.url);
  }
});
