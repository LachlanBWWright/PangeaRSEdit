import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createStore, Provider } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import type { SpriteAsset } from "@pangea/desktop-contracts";
import { desktopProjectAtom, desktopProjectDirtyAtom } from "@/platform/desktop/projectState";
import { workflowProject } from "@/platform/desktop/workflowFixtures.stories.support";
import type { SpriteData } from "../types";
import { previewLinkedSprite } from "../utils/linkedSpriteImport";
import { LinkedSpriteSource } from "./LinkedSpriteSource";

vi.mock("../utils/linkedSpriteImport", async (original) => ({ ...await original<object>(), previewLinkedSprite: vi.fn() }));
const data: SpriteData = { type: "sprites", filename: "robot", sourceBytes: new ArrayBuffer(0),
  data: { colorTable: [], shapes: [{ shapeIndex: 0, frames: [{ header: { width: 1, height: 1, offsetX: 0, offsetY: 0, pixelOffset: 0, maskOffset: 0 }, pixels: new Uint8Array([3]) }], animations: [] }] } };
const palette = { name: "Native", colors: Array.from({ length: 256 }, (_, index) => ({ r: index, g: index, b: index })) };
const asset: SpriteAsset = { version: 1, id: "11111111-1111-4111-8111-111111111111", name: "Robot", nativePath: "Assets/sprites/robot.shapes", shapeIndex: 0,
  source: { mode: "external", imagePath: "/source/robot.png", metadataPath: "/source/robot.json", authoringPath: null, fingerprint: "a".repeat(64) }, frames: [], importedAt: "2026-10-23T00:00:00Z" };
let root: Root | null = null;
const previous = window.pangeaDesktop;
afterEach(async () => { await act(async () => root?.unmount()); root = null; document.body.replaceChildren(); window.pangeaDesktop = previous; vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

async function mount(lossy: boolean, dirty = false, readGate?: Promise<unknown>) {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const converted = data.data.shapes[0];
  if (!converted) return null;
  vi.mocked(previewLinkedSprite).mockClear().mockResolvedValue(ok({ shape: converted, frames: [{ name: "Idle", durationMs: 100, region: { x: 0, y: 0, w: 1, h: 1 }, source: { x: 0, y: 0, w: 1, h: 1 }, width: 1, height: 1 }], changedColors: lossy ? 1 : 0, partialAlpha: 0 }));
  const commit = vi.fn();
  const read = vi.fn();
  const onSaved = vi.fn();
  window.pangeaDesktop = { onProjectChange: () => () => undefined, onTransfer: () => () => undefined, request: async (request) => {
    if (request.operation === "sprites.list") return { ok: true, value: [asset] };
    if (request.operation === "sprites.read") { read(); return readGate ?? { ok: true, value: { asset, imageBytes: new Uint8Array([1]), metadataBytes: null, fingerprint: "b".repeat(64) } }; }
    if (request.operation === "sprites.commit") { commit(request); return { ok: true, value: { ...workflowProject, revision: "imported" } }; }
    return { ok: true, value: undefined };
  } };
  const store = createStore();
  store.set(desktopProjectAtom, { ...workflowProject, files: [{ path: asset.nativePath, hash: "shape", size: 1 }] });
  store.set(desktopProjectDirtyAtom, dirty);
  const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><LinkedSpriteSource data={data} palette={palette} selectedShapeIndex={0} nativePath={asset.nativePath} onSaved={onSaved} /></Provider>));
  return { store, commit, read, onSaved };
}

it("automatically rebuilds compatible source changes and persists source frame metadata", async () => {
  const mounted = await mount(false);
  if (!mounted) return;
  await act(async () => vi.advanceTimersByTimeAsync(2500));
  expect(mounted.commit).toHaveBeenCalledOnce();
  expect(mounted.commit.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ operation: "sprites.commit", fingerprint: "b".repeat(64), frames: [{ name: "Idle", durationMs: 100 }] }));
  expect(mounted.onSaved).toHaveBeenCalledOnce();
});

it("retains unsaved edits by pausing source updates", async () => {
  const mounted = await mount(false, true);
  if (!mounted) return;
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(mounted.read).not.toHaveBeenCalled();
  expect(mounted.commit).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("Save or discard your sprite edits");
});

it("requires explicit review for palette compromises instead of overwriting working pixels", async () => {
  const mounted = await mount(true);
  if (!mounted) return;
  await act(async () => vi.advanceTimersByTimeAsync(2500));
  expect(mounted.commit).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("1 pixels mapped to the palette");
  const apply = [...document.querySelectorAll("button")].find((button) => button.textContent === "Accept conversion and save sprite");
  await act(async () => apply?.click());
  expect(mounted.commit).toHaveBeenCalledOnce();
});

it("keeps a rejected source revision dismissed until another export or manual preview", async () => {
  const mounted = await mount(true);
  if (!mounted) return;
  await act(async () => vi.advanceTimersByTimeAsync(2500));
  const keep = [...document.querySelectorAll("button")].find((button) => button.textContent === "Keep current sprite");
  await act(async () => keep?.click());
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(previewLinkedSprite).toHaveBeenCalledOnce();
  expect(document.body.textContent).not.toContain("Accept conversion and save sprite");
  expect(mounted.commit).not.toHaveBeenCalled();
});

it("ignores a manual source read completing after switching to a copied project", async () => {
  let finishRead: ((value: unknown) => void) | undefined;
  const gate = new Promise<unknown>((resolve) => { finishRead = resolve; });
  const mounted = await mount(false, false, gate);
  if (!mounted) return;
  const preview = [...document.querySelectorAll("button")].find((button) => button.textContent === "Preview reimport");
  await act(async () => preview?.click());
  const originalProject = mounted.store.get(desktopProjectAtom);
  if (!originalProject) return;
  await act(async () => mounted.store.set(desktopProjectAtom, { ...originalProject, folder: "/copied-project" }));
  await act(async () => finishRead?.({ ok: true, value: { asset, imageBytes: new Uint8Array([1]), metadataBytes: null, fingerprint: "b".repeat(64) } }));
  expect(previewLinkedSprite).not.toHaveBeenCalled();
  expect(mounted.commit).not.toHaveBeenCalled();
});
