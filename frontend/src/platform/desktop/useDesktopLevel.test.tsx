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
import { desktopLevelIdAtom, desktopProjectAtom, desktopProjectDirtyAtom, desktopProjectCommandsAtom } from "./projectState";
import { readRecovery } from "./projectActions";
import type { OpenFileArgs } from "@/editor/loadLogic/openFile";

vi.mock("./projectLoad", async (importOriginal) => {
  const original = await importOriginal<typeof import("./projectLoad")>();
  return { ...original, loadProjectLevel: vi.fn() };
});
vi.mock("./projectActions", () => ({ readRecovery: vi.fn(), saveProjectLevel: vi.fn(), testProjectLevel: vi.fn() }));

const snapshot: ProjectSnapshot = {
  folder: "/project", revision: "saved", recoveryAvailable: false,
  manifest: { kind: "pangea-editor-project", version: 1, game: "OttoMatic", name: "Hydration", levels: [
    { id: "one", name: "Level", baseLevel: 1, primary: ".pangea/levels/one/level.ter.rsrc", files: [".pangea/levels/one/level.ter.rsrc"] },
  ] }, files: [{ path: ".pangea/levels/one/level.ter.rsrc", size: 1, hash: "terrain" }],
};

function Binding({ input, handlers }: { input: LevelProjectInput | null; handlers?: Omit<OpenFileArgs, "url" | "gameType"> }) {
  useDesktopLevel({ input, handlers: handlers ?? {
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

it("prevents clean project hydration from overtaking an in-flight recovery", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = { request: async () => ({ ok: true, value: undefined }),
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
  const input: LevelProjectInput = { globals: OttoGlobals, data: splitLevelData(null), mapImages: [],
    mapFile: new File([], "level.ter.rsrc"), baseLevel: 1,
    workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 1)) };
  const first = snapshot.manifest.levels[0];
  if (!first) return;
  const recovered = { ...first, id: "recovered", baseLevel: 2 };
  vi.mocked(readRecovery).mockResolvedValue(ok([
    { path: "pangea.project.json", bytes: Uint8Array.from(new TextEncoder().encode(JSON.stringify({ ...snapshot.manifest, levels: [recovered] }))) },
    { path: recovered.primary, bytes: new Uint8Array([1]) },
  ]));
  let finish: () => void = () => undefined;
  const pending = new Promise<Result<LevelProjectInput, string>>((resolve) => { finish = () => resolve(ok({ ...input, baseLevel: 2 })); });
  vi.mocked(loadProjectLevel).mockReset();
  vi.mocked(loadProjectLevel).mockImplementation(async (_project, _level, _handlers, recovery) => recovery ? pending : ok(input));
  const store = createStore();
  store.set(desktopProjectAtom, snapshot); store.set(desktopLevelIdAtom, "one");
  const container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><Binding input={input} /></Provider>));
  let completion: Promise<void> | undefined;
  await act(async () => { completion = store.get(desktopProjectCommandsAtom)?.recover(); });
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  expect(store.get(desktopLevelIdAtom)).toBe("one");
  await act(async () => { finish(); await completion; });
  expect(store.get(desktopLevelIdAtom)).toBe("recovered");
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  expect(vi.mocked(loadProjectLevel)).toHaveBeenCalledTimes(2);
});

it("keeps a stale level completion from overwriting the newer level's document setters", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = { request: async () => ({ ok: true, value: undefined }),
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
  const first = snapshot.manifest.levels[0];
  if (!first) return;
  const second = { ...first, id: "two", baseLevel: 2, primary: ".pangea/levels/two/level.ter.rsrc" };
  const project = { ...snapshot, manifest: { ...snapshot.manifest, levels: [first, second] }, files: [
    ...snapshot.files, { path: second.primary, size: 1, hash: "second" },
  ] };
  const handlers = { setGlobals: vi.fn(), setMapFile: vi.fn(), setMapImagesFile: vi.fn(), setMapImages: vi.fn(), setData: vi.fn() };
  const finish = new Map<string, () => void>();
  vi.mocked(loadProjectLevel).mockImplementation((_project, level, setters) => new Promise((resolve) => {
    const input: LevelProjectInput = { globals: OttoGlobals, data: splitLevelData(null), mapImages: [],
      mapFile: new File([], `${level.id}.ter.rsrc`), baseLevel: level.baseLevel,
      workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, level.baseLevel)) };
    finish.set(level.id, () => {
      setters.setGlobals(input.globals);
      setters.setMapFile(input.mapFile);
      setters.setMapImagesFile(new File([], `${level.id}.ter`));
      setters.setMapImages([...input.mapImages]);
      setters.setData(input.data);
      resolve(ok(input));
    });
  }));
  const store = createStore();
  store.set(desktopProjectAtom, project); store.set(desktopLevelIdAtom, "one");
  const container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><Binding input={null} handlers={handlers} /></Provider>));
  await act(async () => { store.set(desktopLevelIdAtom, "two"); });
  expect([...finish.keys()]).toEqual(["one", "two"]);
  await act(async () => { finish.get("two")?.(); });
  expect(handlers.setMapFile.mock.lastCall?.[0].name).toBe("two.ter.rsrc");
  await act(async () => { finish.get("one")?.(); });
  for (const setter of Object.values(handlers)) expect(setter).toHaveBeenCalledOnce();
  expect(handlers.setMapFile.mock.lastCall?.[0].name).toBe("two.ter.rsrc");
  expect(store.get(desktopLevelIdAtom)).toBe("two");
  expect(store.get(desktopProjectDirtyAtom)).toBe(false);
});
