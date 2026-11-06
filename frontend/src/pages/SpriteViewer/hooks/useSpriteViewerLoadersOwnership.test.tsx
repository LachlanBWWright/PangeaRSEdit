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
  let loaders: ReturnType<typeof useSpriteViewerLoaders> | undefined;
  function Binding() { loaders = useSpriteViewerLoaders(options); return null; }
  const container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Binding />));
  return { options,
    upload: (file: File, type: FileType, current?: () => boolean, palette?: File) => loaders?.loadCustomFileUpload(file, type, palette, current),
    loadSprites: (filename: string) => loaders?.loadSpritesFile(filename),
    loadTileset: (filename: string) => loaders?.loadTilesetFile(filename),
    cancel: () => loaders?.cancelUpload(),
  };
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

it("starts sprite and border requests together and discards both after cancellation", async () => {
  const shape = deferred<Response>();
  const border = deferred<Response>();
  const fetcher = vi.fn((url: string) => url.endsWith(".shapes") ? shape.promise : border.promise);
  vi.stubGlobal("fetch", fetcher);
  const { options, loadSprites, cancel } = await mount();
  const globalPalette = vi.spyOn(gMightyMikePalette, "loadPaletteFromRGBA");
  const pending = loadSprites("old");
  expect(fetcher.mock.calls).toEqual([
    ["data/mightymike/shapes/old.shapes"],
    ["assets/mightyMike/terrain/border.tga"],
  ]);
  cancel();
  vi.mocked(options.setLoading).mockClear();
  await act(async () => {
    shape.resolve(new Response(new ArrayBuffer(1)));
    border.resolve(new Response(paletteBytes()));
    await pending;
  });
  expect(parseShapesFile).not.toHaveBeenCalled();
  expect(options.setLoadedData).not.toHaveBeenCalled();
  expect(globalPalette).not.toHaveBeenCalled();
  expect(options.setLoading).not.toHaveBeenCalled();
});

it("starts tileset bytes while its palette is pending and ignores completion after unmount", async () => {
  const bytes = deferred<Response>();
  const palette = deferred<Response>();
  const fetcher = vi.fn((url: string) => url.endsWith(".tileset") ? bytes.promise : palette.promise);
  vi.stubGlobal("fetch", fetcher);
  const { options, loadTileset } = await mount();
  const globalPalette = vi.spyOn(gMightyMikePalette, "loadPaletteFromRGBA");
  const pending = loadTileset("candy");
  expect(fetcher.mock.calls).toEqual([
    ["assets/mightyMike/terrain/border.tga"],
    ["assets/mightyMike/terrain/candy.tileset"],
  ]);
  await act(async () => root?.unmount()); root = null;
  vi.mocked(options.setLoading).mockClear();
  await act(async () => {
    palette.resolve(new Response(paletteBytes()));
    bytes.resolve(new Response(new ArrayBuffer(1)));
    await pending;
  });
  expect(options.setLoadedData).not.toHaveBeenCalled();
  expect(globalPalette).not.toHaveBeenCalled();
  expect(options.setLoading).not.toHaveBeenCalled();
});

it("commits sprite data and its border palette when the paired requests complete", async () => {
  const border = deferred<Response>();
  vi.stubGlobal("fetch", vi.fn((url: string) => url.endsWith(".shapes")
    ? Promise.resolve(new Response(new ArrayBuffer(1))) : border.promise));
  const { options, loadSprites } = await mount();
  const pending = loadSprites("player");
  expect(options.setLoadedData).not.toHaveBeenCalled();
  await act(async () => { border.resolve(new Response(paletteBytes())); await pending; });
  expect(options.setLoadedData).toHaveBeenCalledWith(expect.objectContaining({ type: "sprites", filename: "player" }));
  expect(options.setCurrentPalette).toHaveBeenCalledOnce();
  expect(options.setLoading).toHaveBeenLastCalledWith(false);
});

it("reads uploaded sprites and their companion palette concurrently", async () => {
  const bytes = deferred<ArrayBuffer>();
  const main = new AssetFile("custom.shapes", bytes.promise);
  const palette = new AssetFile("palette.tga", Promise.resolve(paletteBytes()));
  const readMain = vi.spyOn(main, "arrayBuffer");
  const readPalette = vi.spyOn(palette, "arrayBuffer");
  const { options, upload } = await mount();
  const pending = upload(main, "sprites", undefined, palette);
  expect(readMain).toHaveBeenCalledOnce();
  expect(readPalette).toHaveBeenCalledOnce();
  await act(async () => { bytes.resolve(new ArrayBuffer(1)); await pending; });
  expect(options.setLoadedData).toHaveBeenCalledOnce();
  expect(options.setCurrentPalette).toHaveBeenCalledOnce();
  expect(options.setLoading).toHaveBeenLastCalledWith(false);
});
