import { afterEach, expect, it, vi } from "vitest";
import { okAsync } from "neverthrow";
import type { GameId } from "@pangea/desktop-contracts";
import { OttoGlobals } from "@/data/globals/globals";
import { splitLevelData } from "@/data/utils/levelDataUtils";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { testProjectLevel, playInstalledGame } from "./projectActions";
import { prepareNativeTest } from "./projectTest";
import type { LevelProjectInput } from "./projectBuild";
import { createStore } from "jotai";
import { desktopGamesOpenAtom, desktopPreviewGameSetupAtom, openPreviewGameSetupAtom } from "./assetAvailability";

vi.mock("./projectTest", () => ({ prepareNativeTest: vi.fn(() => okAsync({ files: [], args: [] })) }));

const originalBridge = window.pangeaDesktop;
const input: LevelProjectInput = {
  globals: OttoGlobals, data: splitLevelData(null), mapImages: [],
  mapFile: new File([], "EarthFarm.ter.rsrc"), baseLevel: 0,
  workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0)),
};
afterEach(() => { window.pangeaDesktop = originalBridge; vi.clearAllMocks(); });

it("opens game setup before compiling a preview when the playable game is missing", async () => {
  const requests: string[] = [];
  window.pangeaDesktop = {
    request: async (request) => { requests.push(request.operation); return { ok: true, value: [] }; },
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined,
  };
  const store = createStore();
  const setup = vi.fn((game: GameId) => store.set(openPreviewGameSetupAtom, game));
  await testProjectLevel(null, input, true, null, setup);
  expect(setup).toHaveBeenCalledWith("OttoMatic");
  expect(store.get(desktopGamesOpenAtom)).toBe(true);
  expect(store.get(desktopPreviewGameSetupAtom)).toBe("OttoMatic");
  expect(prepareNativeTest).not.toHaveBeenCalled();
  expect(requests).toEqual(["games.installed"]);
});

it("opens the same setup for previewing from the main menu", async () => {
  window.pangeaDesktop = {
    request: async () => ({ ok: true, value: [] }),
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined,
  };
  const setup = vi.fn();
  await playInstalledGame(input, setup);
  expect(setup).toHaveBeenCalledWith("OttoMatic");
});

it("launches an installed game without opening setup", async () => {
  const requests: string[] = [];
  window.pangeaDesktop = {
    request: async (request) => {
      requests.push(request.operation);
      return request.operation === "games.installed" ? { ok: true, value: [{
        game: "OttoMatic", version: "test", executable: "/game/OttoMatic", data: "/game/Data", managed: false, assetRootVersion: 2,
      }] } : { ok: true, value: undefined };
    },
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined,
  };
  const setup = vi.fn();
  await testProjectLevel(null, input, false, null, setup);
  expect(setup).not.toHaveBeenCalled();
  expect(prepareNativeTest).toHaveBeenCalledOnce();
  expect(requests).toEqual(["games.installed", "games.test"]);
});

it("offers setup if an installation disappears between checking and launching", async () => {
  window.pangeaDesktop = {
    request: async (request) => request.operation === "games.installed" ? { ok: true, value: [{
      game: "OttoMatic", version: "test", executable: "/game/OttoMatic", data: "/game/Data", managed: false, assetRootVersion: 2,
    }] } : { ok: false, error: { code: "not-installed", message: "Install or locate this game in Games first" } },
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined,
  };
  const setup = vi.fn();
  await playInstalledGame(input, setup);
  expect(setup).toHaveBeenCalledWith("OttoMatic");
});
