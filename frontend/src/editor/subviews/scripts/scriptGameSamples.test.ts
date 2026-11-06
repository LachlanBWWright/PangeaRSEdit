// @vitest-environment node
import "../../../../tests/setup/scriptLuaValidation";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { GAME_SCRIPTING_SAMPLES, createGameSampleWorkspace } from "./scriptGameSamples";
import { buildScriptPackageZip, importScriptPackageZip } from "./scriptWorkspaceState";
import { sampleFilename } from "./scriptSampleLevels";
import { validateScriptWorkspaceAssetsAsync } from "./scriptAssetValidation";

const assetFolders: Readonly<Record<string, string>> = {
  [Game.BUGDOM]: "games/bugdom1", [Game.BUGDOM_2]: "games/bugdom2", [Game.NANOSAUR]: "games/nanosaur1",
  [Game.NANOSAUR_2]: "games/nanosaur2", [Game.CRO_MAG]: "games/cromagrally", [Game.BILLY_FRONTIER]: "games/billyfrontier", [Game.MIGHTY_MIKE]: "data/mightymike",
};

describe("other-game scripting samples", () => {
  for (const sample of GAME_SCRIPTING_SAMPLES) {
    it(`${sample.title}: validates real assets and round-trips editable level hooks and helpers`, async () => {
      const folder = assetFolders[sample.globals.GAME_TYPE];
      expect(folder).toBeDefined();
      const relative = sample.model.replace(/^[^/]+/, (directory) => directory.toLowerCase());
      const bytes = new Uint8Array(await readFile(`public/${folder}/${relative}`));
      const created = createGameSampleWorkspace(sample, bytes);
      expect(created.isErr() ? created.error : null).toBeNull();
      if (created.isErr()) return;
      const state = created.value;
      const valid = await validateScriptWorkspaceAssetsAsync(state);
      expect(valid.isErr() ? valid.error : null).toBeNull();
      expect(state.levels[String(sample.level)]?.globalHooks.map((hook) => hook.hookId)).toEqual(sample.hooks);
      expect(state.context.levelNumber).toBe(sample.level);
      expect(state.sourceFiles[`Data/Scripts/src/levels/${sample.id}.lua`]?.content).toBe(sample.source);
      expect(state.sourceFiles["Data/Scripts/src/helpers/sample.lua"]?.executionScope).toBe("helper");
      const zip = await buildScriptPackageZip(state);
      expect(zip.isErr() ? zip.error : null).toBeNull();
      if (zip.isErr()) return;
      const restored = importScriptPackageZip(zip.value, state.context);
      expect(restored.isErr() ? restored.error : null).toBeNull();
      if (restored.isErr()) return;
      expect(restored.value.levels).toEqual(state.levels);
      expect(restored.value.customObjects).toEqual(state.customObjects);
      expect(sampleFilename(sample)).toMatch(sample.globals.GAME_TYPE === Game.MIGHTY_MIKE ? /\.map-1$/ : sample.globals.GAME_TYPE === Game.NANOSAUR ? /\.ter$/ : /\.ter\.rsrc$/);
    });
  }
});
