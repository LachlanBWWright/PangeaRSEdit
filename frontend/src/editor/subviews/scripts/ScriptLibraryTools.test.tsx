import { act } from "react";
import { createRoot } from "react-dom/client";
import { createStore, Provider } from "jotai";
import { ok } from "neverthrow";
import { expect, it, vi } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { ScriptLibraryTools } from "./ScriptLibraryTools";
import { useScriptWorkspace } from "./useScriptWorkspace";
import { createScriptWorkspaceContext, ensureScriptWorkspace, replaceScriptWorkspace,
  scriptWorkspaceStoreAtom, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { restoreScriptAuthoringAssets } from "./scriptAuthoringAttachments";
import { buildScriptLibrary } from "./scriptLibrary";
import { createObjectDefinition } from "./scriptObjectActions";

vi.mock("./scriptAuthoringAttachments", async (importOriginal) => ({
  ...await importOriginal<typeof import("./scriptAuthoringAttachments")>(),
  restoreScriptAuthoringAssets: vi.fn(),
}));

const context = createScriptWorkspaceContext(OttoGlobals, 0);
function LibraryTools() {
  const { workspace, update } = useScriptWorkspace(context);
  return <ScriptLibraryTools workspace={workspace} update={update} />;
}

it("applies the production import to current state after restoring assets", async () => {
  const store = createStore();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let finish: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const restore = vi.mocked(restoreScriptAuthoringAssets).mockImplementation(async () => { await pending; return ok(undefined); });
  await act(async () => root.render(<Provider store={store}><LibraryTools /></Provider>));
  const file = new File(["return { imported = true }"], "shared.lua");
  Object.defineProperty(file, "webkitRelativePath", { value: "src/shared.lua" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve("return { imported = true }") });
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Update Lua folder"]');
  if (!input) { expect.fail("Missing production folder picker"); return; }
  Object.defineProperty(input, "files", { value: [file] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  const apply = [...document.querySelectorAll("button")].find((button) => button.textContent === "Apply selected changes");
  expect(apply).toBeDefined();
  await act(async () => { apply?.click(); });
  expect(restore).toHaveBeenCalledTimes(1);
  expect([...document.querySelectorAll("button")].find((button) => button.textContent === "Cancel")?.disabled).toBe(true);
  await act(async () => store.set(scriptWorkspaceStoreAtom, (current) => replaceScriptWorkspace(current,
    upsertScriptSourceFile(ensureScriptWorkspace(current, context), "Data/Scripts/src/local.lua", "return { edited = true }"))));
  await act(async () => { finish(); await pending; });
  const workspace = ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), context);
  expect(workspace.sourceFiles["Data/Scripts/src/shared.lua"]?.content).toContain("imported");
  expect(workspace.sourceFiles["Data/Scripts/src/local.lua"]?.content).toContain("edited");
  expect(container.textContent).toContain("Imported selected changes");
  await act(async () => root.unmount());
  container.remove();
});

it("keeps the review open and reports final merge failures after unselected dependencies change", async () => {
  const store = createStore();
  const base = ensureScriptWorkspace({}, context);
  const created = createObjectDefinition(base, "Lantern", "blank");
  if (created.isErr()) { expect.fail(created.error); return; }
  const object = created.value.state.customObjects[0];
  if (!object) { expect.fail("Missing fixture object"); return; }
  const bundle = buildScriptLibrary(created.value.state);
  if (bundle.isErr()) { expect.fail(bundle.error); return; }
  store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, { ...created.value.state, customObjects: [] }));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let finish: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  vi.mocked(restoreScriptAuthoringAssets).mockImplementation(async () => { await pending; return ok(undefined); });
  await act(async () => root.render(<Provider store={store}><LibraryTools /></Provider>));
  const file = new File([Uint8Array.from(bundle.value)], "library.zip");
  Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(Uint8Array.from(bundle.value).buffer) });
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Import shared library"]');
  if (!input) { expect.fail("Missing production library picker"); return; }
  Object.defineProperty(input, "files", { value: [file] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  const apply = [...document.querySelectorAll("button")].find((button) => button.textContent === "Apply selected changes");
  expect(apply).toBeDefined();
  await act(async () => { apply?.click(); });
  await act(async () => store.set(scriptWorkspaceStoreAtom, (current) => {
    const workspace = ensureScriptWorkspace(current, context);
    return replaceScriptWorkspace(current, { ...workspace,
      sourceFiles: Object.fromEntries(Object.entries(workspace.sourceFiles).filter(([path]) => path !== object.sourceFilePath)) });
  }));
  await act(async () => { finish(); await pending; });
  const workspace = ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), context);
  expect(workspace.customObjects).toEqual([]);
  expect(workspace.sourceFiles[object.sourceFilePath]).toBeUndefined();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Select the source for Lantern as well");
  expect(container.textContent).not.toContain("Imported selected changes");
  await act(async () => root.unmount());
  container.remove();
});
