import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createStore, Provider } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import { ok, type Result } from "neverthrow";
import type { ProjectSnapshot } from "@pangea/desktop-contracts";
import { OttoGlobals } from "@/data/globals/globals";
import { splitLevelData } from "@/data/utils/levelDataUtils";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "@/editor/subviews/scripts/scriptWorkspaceState";
import type { LevelProjectInput } from "./projectBuild";
import { useDesktopLevel } from "./useDesktopLevel";
import { loadProjectLevel } from "./projectLoad";
import { desktopLevelIdAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";

vi.mock("./projectLoad", () => ({ loadProjectLevel: vi.fn() }));

const snapshot: ProjectSnapshot = {
  folder: "/project", revision: "saved", recoveryAvailable: false,
  manifest: { kind: "pangea-editor-project", version: 1, game: "OttoMatic", name: "Hydration", levels: [
    { id: "one", name: "Level", baseLevel: 1, primary: ".pangea/levels/one/level.ter.rsrc", files: [".pangea/levels/one/level.ter.rsrc"] },
  ] }, files: [{ path: ".pangea/levels/one/level.ter.rsrc", size: 1, hash: "terrain" }],
};

function Binding({ input }: { input: LevelProjectInput | null }) {
  useDesktopLevel({ input, handlers: {
    setGlobals: vi.fn(), setMapFile: vi.fn(), setMapImagesFile: vi.fn(), setMapImages: vi.fn(), setData: vi.fn(),
  }, setBaseLevel: vi.fn(), clearLevel: vi.fn(), setScriptStore: vi.fn() });
  return null;
}

let root: Root | null = null;
const originalBridge = window.pangeaDesktop;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  window.pangeaDesktop = originalBridge;
  vi.unstubAllGlobals();
});

it("compares staged level updates against the complete loaded document", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = { request: async () => ({ ok: true, value: undefined }),
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
  const store = createStore();
  store.set(desktopProjectAtom, snapshot);
  store.set(desktopLevelIdAtom, "one");
  const input: LevelProjectInput = { globals: OttoGlobals, data: splitLevelData(null), mapImages: [],
    mapFile: new File([], "level.ter.rsrc"), baseLevel: 1,
    workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 1)) };
  vi.mocked(loadProjectLevel).mockResolvedValue(ok(input));
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const render = async (input: LevelProjectInput | null) => {
    await act(async () => root?.render(<Provider store={store}><Binding input={input} /></Provider>));
  };
  await render(null);
  await render({ ...input, mapFile: new File([], "previous-level.ter.rsrc") });
  await render({ ...input, baseLevel: 0 });
  await render(input);
  expect(store.get(desktopProjectDirtyAtom)).toBe(false);
  await render({ ...input, baseLevel: 2 });
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
});

it("does not mark the previous document dirty while the selected level is loading", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = { request: async () => ({ ok: true, value: undefined }),
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
  const input: LevelProjectInput = { globals: OttoGlobals, data: splitLevelData(null), mapImages: [],
    mapFile: new File([], "level.ter.rsrc"), baseLevel: 1,
    workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 1)) };
  let finish: () => void = () => undefined;
  const pending = new Promise<Result<LevelProjectInput, string>>((resolve) => {
    finish = () => { resolve(ok(input)); };
  });
  vi.mocked(loadProjectLevel).mockReturnValue(pending);
  const store = createStore();
  store.set(desktopProjectAtom, snapshot);
  store.set(desktopLevelIdAtom, "one");
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><Binding input={input} /></Provider>));
  const dirtyDuringLoad = store.get(desktopProjectDirtyAtom);
  await act(async () => { finish(); await pending; });
  expect(dirtyDuringLoad).toBe(false);
});
