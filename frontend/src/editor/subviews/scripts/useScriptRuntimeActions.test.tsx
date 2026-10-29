import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider, createStore } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import { createBlankLevel, type BlankLevelData } from "@/data/levelTemplates";
import { OttoGlobals } from "@/data/globals/globals";
import { desktopProjectCommandsAtom, type ProjectCommands } from "@/platform/desktop/projectState";
import { USER_BOOTSTRAP_PATH, createScriptWorkspaceContext, ensureScriptWorkspace, replaceScriptWorkspace, updateScriptSourceContent } from "./scriptWorkspaceState";
import { useScriptRuntimeActions } from "./useScriptRuntimeActions";
import { validateLuaWorkspace } from "./scriptLuaValidation";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import type { LuaValidationDiagnostic } from "./scriptLuaValidationTypes";

vi.mock("./scriptLuaValidation", () => ({
  validateLuaWorkspace: vi.fn(() => okAsync(undefined)),
}));

vi.mock("./scriptPreviewExportActions", () => ({
  prepareScriptPreviewBundle: vi.fn(), buildExtendedLevelArchive: vi.fn(), buildOriginalCompatibleArchive: vi.fn(),
}));
import { buildExtendedLevelArchive, prepareScriptPreviewBundle } from "./scriptPreviewExportActions";

let root: Root | null = null;
const originalBridge = window.pangeaDesktop;
const testNative = vi.fn<(withScripts?: boolean) => Promise<void>>(async () => undefined);
const updateWorkspace = vi.fn<UpdateScriptWorkspace>();
const commands: ProjectCommands = {
  test: testNative, save: async () => undefined, recover: async () => undefined,
  discard: () => undefined, baseLevel: 0, canSave: true, setBaseLevel: () => undefined,
};

function TestActions() {
  const blank = createBlankLevel(OttoGlobals.GAME_TYPE, { width: 16, height: 16 });
  if (blank.isErr()) return null;
  return <Actions input={blank.value} />;
}

function Actions({ input }: { input: BlankLevelData }) {
  const [workspace, setWorkspace] = useState(() => ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0)));
  const actions = useScriptRuntimeActions({ ...input, globals: OttoGlobals, levelNumber: 0, mapImages: [], workspace,
    update: (transform) => { updateWorkspace(transform); setWorkspace(transform); },
    persist: (state) => setWorkspace(ensureScriptWorkspace(replaceScriptWorkspace({}, state), state.context)) });
  return <>
    <button disabled={actions.busy} onClick={() => void actions.test(true)}>Test level</button>
    <button disabled={actions.busy} onClick={() => void actions.exportPackage("extended")}>Export level</button>
    <button onClick={() => setWorkspace((state) => updateScriptSourceContent(state, USER_BOOTSTRAP_PATH, "return { newerDraft = true }"))}>Edit Lua</button>
    <output aria-label="Current Lua source">{workspace.sourceFiles[USER_BOOTSTRAP_PATH]?.content}</output>
    <output aria-label="Preview open">{String(actions.previewOpen)}</output>
  </>;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  window.pangeaDesktop = originalBridge;
  document.body.replaceChildren();
  vi.clearAllMocks();
  vi.mocked(validateLuaWorkspace).mockImplementation(() => okAsync(undefined));
  vi.unstubAllGlobals();
});

it("opens a prepared browser preview after persisted generated sources refresh", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = undefined;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  vi.mocked(prepareScriptPreviewBundle).mockImplementation(async () => {
    await pending;
    return ok({ dataBytes: null, rsrcBytes: null, textureBytes: null, customFiles: [] });
  });
  const element = document.createElement("div");
  document.body.append(element);
  root = createRoot(element);
  await act(async () => root?.render(<Provider store={createStore()}><TestActions /></Provider>));
  await act(async () => element.querySelector("button")?.click());
  expect(prepareScriptPreviewBundle).toHaveBeenCalledOnce();
  await act(async () => release?.());
  expect(element.querySelector('[aria-label="Preview open"]')?.textContent).toBe("true");
});

it("routes Scripts Test level through the native project snapshot instead of a WASM preview", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = {
    request: async () => ({ ok: true, value: undefined }),
    onProjectChange: () => () => undefined, onTransfer: () => () => undefined,
  };
  const store = createStore();
  store.set(desktopProjectCommandsAtom, commands);
  const element = document.createElement("div");
  document.body.append(element);
  root = createRoot(element);
  await act(async () => root?.render(<Provider store={store}><TestActions /></Provider>));
  await act(async () => element.querySelector("button")?.click());
  expect(testNative).toHaveBeenCalledWith(true);
  expect(validateLuaWorkspace).toHaveBeenCalledOnce();
  expect(prepareScriptPreviewBundle).not.toHaveBeenCalled();
});

it("blocks native launch when Lua validation fails", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = { request: async () => undefined, onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
  vi.mocked(validateLuaWorkspace).mockImplementation(() => errAsync([{
    phase: "syntax", filePath: "Data/Scripts/dist/modules/user.lua", message: "unexpected symbol", line: 2,
  }]));
  const store = createStore();
  store.set(desktopProjectCommandsAtom, commands);
  const element = document.createElement("div");
  document.body.append(element);
  root = createRoot(element);
  await act(async () => root?.render(<Provider store={store}><TestActions /></Provider>));
  await act(async () => element.querySelector("button")?.click());
  expect(validateLuaWorkspace).toHaveBeenCalledOnce();
  expect(testNative).not.toHaveBeenCalled();
  expect(prepareScriptPreviewBundle).not.toHaveBeenCalled();
  const transform = updateWorkspace.mock.calls[0]?.[0];
  expect(transform).toBeDefined();
  const workspace = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
  expect(transform?.(workspace).diagnostics).toContainEqual({
    category: "source-validation", severity: "error", code: "lua.syntax",
    filePath: "Data/Scripts/src/user.lua", message: "unexpected symbol", line: 2, column: 1,
  });
});

it("keeps a desktop session without a project from silently opening a browser preview", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = { request: async () => undefined, onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
  const element = document.createElement("div");
  document.body.append(element);
  root = createRoot(element);
  await act(async () => root?.render(<Provider store={createStore()}><TestActions /></Provider>));
  await act(async () => element.querySelector("button")?.click());
  expect(testNative).not.toHaveBeenCalled();
  expect(prepareScriptPreviewBundle).not.toHaveBeenCalled();
});

it.each([
  { action: "Test level", fails: false }, { action: "Export level", fails: false },
  { action: "Test level", fails: true }, { action: "Export level", fails: true },
])("retains edits made while $action waits for Lua validation (failure: $fails)", async ({ action, fails }) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = { request: async () => undefined, onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
  let finish: (() => void) | undefined;
  const pending = new Promise<undefined>((resolve) => { finish = () => resolve(undefined); });
  const staleErrors: readonly LuaValidationDiagnostic[] = [{
    phase: "syntax", filePath: "Data/Scripts/dist/modules/user.lua", message: "old draft error", line: 1,
  }];
  vi.mocked(validateLuaWorkspace).mockImplementation(() => ResultAsync.fromPromise(pending, () => []).andThen(() =>
    fails ? errAsync(staleErrors) : okAsync(undefined)));
  const store = createStore();
  store.set(desktopProjectCommandsAtom, commands);
  const element = document.createElement("div");
  document.body.append(element);
  root = createRoot(element);
  await act(async () => root?.render(<Provider store={store}><TestActions /></Provider>));
  const trigger = [...element.querySelectorAll("button")].find((button) => button.textContent === action);
  await act(async () => trigger?.click());
  const edit = [...element.querySelectorAll("button")].find((button) => button.textContent === "Edit Lua");
  await act(async () => edit?.click());
  await act(async () => finish?.());
  expect(element.querySelector("output")?.textContent).toBe("return { newerDraft = true }");
  expect(trigger?.disabled).toBe(false);
  expect(testNative).not.toHaveBeenCalled();
  expect(prepareScriptPreviewBundle).not.toHaveBeenCalled();
  expect(buildExtendedLevelArchive).not.toHaveBeenCalled();
  expect(updateWorkspace).not.toHaveBeenCalled();
});
