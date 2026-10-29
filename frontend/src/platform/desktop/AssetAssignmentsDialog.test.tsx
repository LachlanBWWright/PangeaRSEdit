import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createStore, Provider } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import type { GameId, ProjectSnapshot } from "@pangea/desktop-contracts";
import { AssetAssignmentsDialog } from "./AssetAssignmentsDialog";
import { desktopProjectAtom, desktopProjectDialogAtom } from "./projectState";

function project(folder: string, game: GameId): ProjectSnapshot {
  return { folder, revision: "base", recoveryAvailable: false,
    manifest: { kind: "pangea-editor-project", version: 1, name: folder, game, levels: [
      { id: "farm", name: "Farm", baseLevel: 0, primary: ".pangea/levels/farm/level.ter.rsrc", files: [".pangea/levels/farm/level.ter.rsrc"] },
    ] }, files: [{ path: "Assets/farm.tga", size: 768, hash: "palette" }] };
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

function button(name: string) {
  return Array.from(document.querySelectorAll("button")).find((element) => element.textContent === name);
}

function select(label: string) {
  if (label === "Assignment scope") return document.querySelector<HTMLSelectElement>('[aria-label="Assignment scope"]');
  return Array.from(document.querySelectorAll("label")).find((element) => element.textContent?.startsWith(label))?.querySelector("select");
}

async function choose(label: string, value: string) {
  await act(async () => {
    const element = select(label);
    if (element) { element.value = value; element.dispatchEvent(new Event("change", { bubbles: true })); }
  });
}

async function mount(snapshot: ProjectSnapshot) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const save = vi.fn();
  window.pangeaDesktop = { onTransfer: () => () => undefined, onProjectChange: () => () => undefined,
    request: async (request) => {
      if (request.operation === "games.asset-files") return { ok: true, value: [{ path: "Data/Images/farm.tga", size: 1024 }] };
      if (request.operation === "project.save") save(request);
      return { ok: true, value: undefined };
    },
  };
  const store = createStore();
  store.set(desktopProjectAtom, snapshot);
  store.set(desktopProjectDialogAtom, "assignments");
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><AssetAssignmentsDialog /></Provider>));
  await act(async () => button("Load targets from installed game")?.click());
  await choose("Project source asset", "Assets/farm.tga");
  await choose("Native replacement target", "Data/Images/farm.tga");
  expect(button("Add assignment")?.disabled).toBe(false);
  return { store, save };
}

it("resets source, target and scope when switching projects and games", async () => {
  const { store, save } = await mount(project("/first", "OttoMatic"));
  await choose("Assignment scope", "selected");
  const checkbox = Array.from(document.querySelectorAll("label")).find((element) => element.textContent === "Farm")?.querySelector("input");
  await act(async () => checkbox?.click());
  await act(async () => store.set(desktopProjectAtom, { ...project("/second", "Bugdom"), files: [] }));
  expect(select("Project source asset")?.value).toBe("");
  expect(select("Native replacement target")?.value).toBe("");
  expect(document.querySelector<HTMLSelectElement>('[aria-label="Assignment scope"]')?.value).toBe("all");
  expect(button("Add assignment")?.disabled).toBe(true);
  await act(async () => button("Add assignment")?.click());
  expect(save).not.toHaveBeenCalled();
});

it("disables an assignment when its source is removed by an external project refresh", async () => {
  const first = project("/first", "OttoMatic");
  const { store, save } = await mount(first);
  await act(async () => store.set(desktopProjectAtom, { ...first, revision: "removed", files: [] }));
  expect(button("Add assignment")?.disabled).toBe(true);
  await act(async () => button("Add assignment")?.click());
  expect(save).not.toHaveBeenCalled();
});

it("requires a surviving level when the selected scope loses its levels", async () => {
  const first = project("/first", "OttoMatic");
  const { store, save } = await mount(first);
  await choose("Assignment scope", "selected");
  const checkbox = Array.from(document.querySelectorAll("label")).find((element) => element.textContent === "Farm")?.querySelector("input");
  await act(async () => checkbox?.click());
  expect(button("Add assignment")?.disabled).toBe(false);
  await act(async () => store.set(desktopProjectAtom, { ...first, revision: "deleted-level", manifest: { ...first.manifest, levels: [] } }));
  expect(button("Add assignment")?.disabled).toBe(true);
  await act(async () => button("Add assignment")?.click());
  expect(save).not.toHaveBeenCalled();
});
