import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import { useSpriteViewerLoaders, type LoaderOptions } from "./useSpriteViewerLoaders";
import type { FileType } from "../types";
import { parseShapesFile } from "@/parsers/mightyMikeShapesParser";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";

vi.mock(import("@/parsers/mightyMikeShapesParser"), async (original) => ({ ...await original(), parseShapesFile: vi.fn() }));

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve: (value: T) => resolve(value) };
}

class AssetFile extends File {
  constructor(name: string, private readonly pendingBytes: Promise<ArrayBuffer>) { super([], name); }
  override arrayBuffer() { return this.pendingBytes; }
}

function paletteBytes() {
  const bytes = new Uint8Array(18 + 768 + 2);
  const view = new DataView(bytes.buffer);
  bytes[1] = 1; bytes[2] = 9; bytes[7] = 24; bytes[16] = 8;
  view.setUint16(5, 256, true); view.setUint16(12, 1, true); view.setUint16(14, 1, true);
  return bytes.buffer;
}

let root: Root | null = null;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

async function mount() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(parseShapesFile).mockReturnValue(ok({ colorTable: [], shapes: [] }));
  const options: LoaderOptions = { setLoadedData: vi.fn(), setLoading: vi.fn(), setSelectedShapeIndex: vi.fn(),
    setSelectedFrameIndex: vi.fn(), setSelectedTileIndex: vi.fn(), setCurrentTilesetScene: vi.fn(),
    setCurrentTilesetPaletteScene: vi.fn(), setCurrentPalette: vi.fn() };
  let upload: ((file: File, type: FileType, palette?: File, current?: () => boolean) => Promise<void>) | undefined;
  function Binding() { upload = useSpriteViewerLoaders(options).loadCustomFileUpload; return null; }
  const container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Binding />));
  return { options, upload: (file: File, type: FileType, current?: () => boolean) => upload?.(file, type, undefined, current) };
}

it("does not restore sprite bytes or palette after a project expires during file reading", async () => {
  const bytes = deferred<ArrayBuffer>();
  const { options, upload } = await mount();
  let current = true;
  const pending = upload(new AssetFile("old.tga", bytes.promise), "tga", () => current);
  current = false;
  await act(async () => { bytes.resolve(paletteBytes()); await pending; });
  expect(options.setLoadedData).not.toHaveBeenCalled();
  expect(options.setCurrentPalette).not.toHaveBeenCalled();
  expect(options.setLoading).toHaveBeenLastCalledWith(false);
});

it("discards a deferred border palette without changing cleared sprite data or the shared palette", async () => {
  const border = deferred<Response>();
  vi.stubGlobal("fetch", vi.fn(() => border.promise));
  const { options, upload } = await mount();
  const globalPalette = vi.spyOn(gMightyMikePalette, "loadPaletteFromRGBA");
  let current = true;
  const pending = upload(new AssetFile("old.shapes", Promise.resolve(new ArrayBuffer(1))), "sprites", () => current);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(parseShapesFile).toHaveBeenCalledOnce();
  current = false;
  await act(async () => { border.resolve(new Response(paletteBytes())); await pending; });
  expect(options.setLoadedData).not.toHaveBeenCalled();
  expect(options.setCurrentPalette).not.toHaveBeenCalled();
  expect(globalPalette).not.toHaveBeenCalled();
  expect(options.setLoading).toHaveBeenLastCalledWith(false);
});

it("preserves a newer upload when old sprite file reading finishes later", async () => {
  const oldBytes = deferred<ArrayBuffer>();
  const { options, upload } = await mount();
  const old = upload(new AssetFile("old.tga", oldBytes.promise), "tga");
  await act(async () => { await upload(new AssetFile("new.tga", Promise.resolve(paletteBytes())), "tga"); });
  expect(options.setLoadedData).toHaveBeenCalledOnce();
  vi.mocked(options.setLoadedData).mockClear();
  vi.mocked(options.setLoading).mockClear();
  await act(async () => { oldBytes.resolve(paletteBytes()); await old; });
  expect(options.setLoadedData).not.toHaveBeenCalled();
  expect(options.setLoading).not.toHaveBeenCalled();
});

it("does not commit sprite file completion after unmount", async () => {
  const bytes = deferred<ArrayBuffer>();
  const { options, upload } = await mount();
  const pending = upload(new AssetFile("old.tga", bytes.promise), "tga");
  await act(async () => root?.unmount()); root = null;
  vi.mocked(options.setLoading).mockClear();
  await act(async () => { bytes.resolve(paletteBytes()); await pending; });
  expect(options.setLoadedData).not.toHaveBeenCalled();
  expect(options.setCurrentPalette).not.toHaveBeenCalled();
  expect(options.setLoading).not.toHaveBeenCalled();
});
