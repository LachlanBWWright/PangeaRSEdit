import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ResultAsync } from "neverthrow";
import { toast } from "sonner";
import { parseShapesFile } from "@/parsers/mightyMikeShapesParser";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";
import { extractTGAPaletteRaw } from "@/utils/tgaParser";
import {
  createTilesetGridPreview,
  parseTilesetFile,
  rerenderTilesetWithPalette,
  type RGBColor,
} from "@/parsers/mightyMikeTilesetParser";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";
import { mapErr } from "@/utils/mapErr";
import { createPalette, type Palette } from "../utils/paletteUtils";
import type { FileType, LoadedData } from "../types";

interface LoaderOptions {
  readonly setLoadedData: Dispatch<SetStateAction<LoadedData>>;
  readonly setLoading: Dispatch<SetStateAction<boolean>>;
  readonly setSelectedShapeIndex: Dispatch<SetStateAction<number>>;
  readonly setSelectedFrameIndex: Dispatch<SetStateAction<number>>;
  readonly setSelectedTileIndex: Dispatch<SetStateAction<number | undefined>>;
  readonly setCurrentTilesetScene: Dispatch<SetStateAction<string>>;
  readonly setCurrentTilesetPaletteScene: Dispatch<SetStateAction<string>>;
  readonly setCurrentPalette: Dispatch<SetStateAction<Palette>>;
}

const sceneToTga: Record<string, string> = {
  bargain: "bargainscene",
  candy: "candyscene",
  clown: "clownscene",
  fairy: "fairyscene",
  jurassic: "dinoscene",
};

async function fetchBytes(url: string): Promise<ArrayBuffer | null> {
  const responseResult = await ResultAsync.fromPromise(fetch(url), mapErr);
  if (responseResult.isErr()) {
    toast.error(responseResult.error);
    return null;
  }
  if (!responseResult.value.ok) {
    toast.error(`Failed to load ${url}: ${responseResult.value.statusText}`);
    return null;
  }
  const bufferResult = await ResultAsync.fromPromise(
    responseResult.value.arrayBuffer(),
    mapErr,
  );
  if (bufferResult.isErr()) {
    toast.error(bufferResult.error);
    return null;
  }
  return bufferResult.value;
}

function paletteFromRgba(name: string, rgba: Uint8Array): Palette {
  const palette = createPalette(name);
  palette.colors = Array.from({ length: 256 }, (_, index) => {
    const offset = index * 4;
    return {
      r: rgba[offset] ?? 0,
      g: rgba[offset + 1] ?? 0,
      b: rgba[offset + 2] ?? 0,
    };
  });
  return palette;
}

async function loadBorderPalette(): Promise<Uint8Array | null> {
  const buffer = await fetchBytes("assets/mightyMike/terrain/border.tga");
  if (!buffer) return null;
  const result = extractTGAPaletteRaw(buffer);
  if (!result) {
    toast.error("Invalid border palette format");
    return null;
  }
  return new Uint8Array(result.colors);
}

function applyPalette(setCurrentPalette: Dispatch<SetStateAction<Palette>>, name: string, rgba: Uint8Array): void {
  gMightyMikePalette.loadPaletteFromRGBA(rgba);
  setCurrentPalette(paletteFromRgba(name, gMightyMikePalette.getPaletteAsRGBA()));
}

function extractTgaPalette(buffer: ArrayBuffer): RGBColor[] | null {
  const view = new DataView(buffer);
  if (view.byteLength < 18 || view.getUint8(1) !== 1 || view.getUint16(5, true) < 256) return null;
  const offset = 18 + view.getUint8(0);
  const bytesPerEntry = view.getUint8(7) / 8;
  if (bytesPerEntry < 3) return null;
  return Array.from({ length: 256 }, (_, index) => {
    const entryOffset = offset + index * bytesPerEntry;
    return {
      r: view.getUint8(entryOffset + 2),
      g: view.getUint8(entryOffset + 1),
      b: view.getUint8(entryOffset),
    };
  });
}

function paletteToRgba(colors: readonly RGBColor[]): Uint8Array {
  const rgba = new Uint8Array(1024);
  colors.forEach((color, index) => {
    const offset = index * 4;
    rgba[offset] = color.r;
    rgba[offset + 1] = color.g;
    rgba[offset + 2] = color.b;
    rgba[offset + 3] = 255;
  });
  return rgba;
}

export function useSpriteViewerLoaders(options: LoaderOptions) {
  const loadCustomFileUpload = useCallback(async (file: File, fileType: FileType) => {
    const filename = file.name.toLowerCase();
    const extension = fileType === "sprites" ? ".shapes" : fileType === "tga" ? ".tga" : ".tileset";
    if (!filename.endsWith(extension)) {
      toast.error(`Please select a ${extension} file`);
      return;
    }
    options.setLoading(true);
    const bufferResult = await ResultAsync.fromPromise(file.arrayBuffer(), mapErr);
    if (bufferResult.isErr()) {
      toast.error(bufferResult.error);
      options.setLoading(false);
      return;
    }
    const buffer = bufferResult.value;
    if (fileType === "sprites") {
      const result = parseShapesFile(buffer);
      if (result.isErr()) {
        toast.error(`Failed to parse: ${result.error}`);
        options.setLoading(false);
        return;
      }
      options.setLoadedData({ type: "sprites", data: result.value, filename: file.name, sourceBytes: buffer });
      options.setSelectedShapeIndex(0);
      options.setSelectedFrameIndex(0);
      const border = await loadBorderPalette();
      if (border) applyPalette(options.setCurrentPalette, "Border Palette", border);
      toast.success(`Loaded: ${result.value.shapes.length} shapes`);
    } else if (fileType === "tga") {
      const result = parseTGAToCanvas(buffer);
      if (result.isErr()) {
        toast.error(`Failed to parse: ${result.error}`);
        options.setLoading(false);
        return;
      }
      options.setLoadedData({ type: "tga", data: result.value, filename: file.name, sourceBytes: buffer });
      toast.success("Loaded TGA image");
    } else {
      toast.info("Custom tileset upload not yet fully supported. Use the asset browser to load tilesets.");
    }
    options.setLoading(false);
  }, [options]);

  const loadSpritesFile = useCallback(async (filename: string) => {
    options.setLoading(true);
    const buffer = await fetchBytes(`data/mightymike/shapes/${filename}.shapes`);
    if (!buffer) {
      options.setLoading(false);
      return;
    }
    const result = parseShapesFile(buffer);
    if (result.isErr()) {
      toast.error(`Failed to parse shapes file: ${result.error}`);
      options.setLoading(false);
      return;
    }
    options.setLoadedData({ type: "sprites", data: result.value, filename, sourceBytes: buffer });
    options.setSelectedShapeIndex(0);
    options.setSelectedFrameIndex(0);
    const border = await loadBorderPalette();
    if (border) applyPalette(options.setCurrentPalette, "Border Palette", border);
    toast.success(`Loaded ${filename}: ${result.value.shapes.length} shapes`);
    options.setLoading(false);
  }, [options]);

  const loadTGAFile = useCallback(async (filename: string) => {
    options.setLoading(true);
    const buffer = await fetchBytes(`assets/mightyMike/terrain/${filename}.tga`);
    if (!buffer) {
      options.setLoading(false);
      return;
    }
    const result = parseTGAToCanvas(buffer);
    if (result.isErr()) {
      toast.error(`Failed to parse TGA file: ${result.error}`);
      options.setLoading(false);
      return;
    }
    options.setLoadedData({ type: "tga", data: result.value, filename, sourceBytes: buffer });
    toast.success(`Loaded TGA: ${filename}`);
    options.setLoading(false);
  }, [options]);

  const loadTilesetFile = useCallback(async (filename: string) => {
    options.setLoading(true);
    const paletteBuffer = await fetchBytes("assets/mightyMike/terrain/border.tga");
    if (!paletteBuffer) {
      options.setLoading(false);
      return;
    }
    const palette = extractTgaPalette(paletteBuffer);
    if (!palette) {
      toast.error("TGA file does not have a valid color map");
      options.setLoading(false);
      return;
    }
    const rgba = paletteToRgba(palette);
    gMightyMikePalette.loadPaletteFromRGBA(rgba);
    const buffer = await fetchBytes(`assets/mightyMike/terrain/${filename}.tileset`);
    if (!buffer) {
      options.setLoading(false);
      return;
    }
    const correctedPalette = paletteFromRgba(filename, gMightyMikePalette.getPaletteAsRGBA()).colors;
    const result = parseTilesetFile(buffer, correctedPalette);
    if (result.isErr()) {
      toast.error(`Failed to parse tileset: ${result.error}`);
      options.setLoading(false);
      return;
    }
    options.setLoadedData({ type: "tileset", data: result.value, gridCanvas: createTilesetGridPreview(result.value), filename, sourceBytes: buffer });
    options.setSelectedTileIndex(undefined);
    options.setCurrentTilesetScene(filename);
    options.setCurrentTilesetPaletteScene(filename);
    setPaletteFromManager(options.setCurrentPalette, `${filename} Scene Palette (Gamma-Corrected)`);
    toast.success(`Loaded tileset: ${filename} (${result.value.numTileDefinitions} tiles)`);
    options.setLoading(false);
  }, [options]);

  const loadPalette = useCallback(async (palette: Palette, updateTileset: boolean) => {
    const sceneName = ["candy", "bargain", "clown", "fairy", "jurassic"].find(
      (name) => palette.name.toLowerCase() === name,
    );
    if (!sceneName) {
      options.setCurrentPalette(palette);
      return;
    }
    const buffer = await fetchBytes(`assets/mightyMike/terrain/${sceneToTga[sceneName] ?? sceneName}.tga`);
    if (!buffer) return;
    const colors = extractTgaPalette(buffer);
    if (!colors) {
      toast.error("Invalid TGA palette format");
      return;
    }
    gMightyMikePalette.loadPaletteFromRGBA(paletteToRgba(colors));
    setPaletteFromManager(options.setCurrentPalette, palette.name);
    if (updateTileset) updateLoadedTilesetPalette(options.setLoadedData, sceneName);
    toast.success(`Loaded ${palette.name} palette`);
  }, [options]);

  const changeTilesetPaletteScene = useCallback(async (sceneName: string) => {
    options.setCurrentTilesetPaletteScene(sceneName);
    const buffer = await fetchBytes(`assets/mightyMike/terrain/${sceneToTga[sceneName] ?? sceneName}.tga`);
    if (!buffer) return;
    const colors = extractTgaPalette(buffer);
    if (!colors) {
      toast.error("Invalid TGA palette format");
      return;
    }
    gMightyMikePalette.loadPaletteFromRGBA(paletteToRgba(colors));
    const paletteColors = paletteFromRgba(`${sceneName} Palette (Mixed)`, gMightyMikePalette.getPaletteAsRGBA()).colors;
    options.setCurrentPalette({ name: `${sceneName} Palette (Mixed)`, colors: paletteColors });
    options.setLoadedData((loadedData) => updateTilesetData(loadedData, paletteColors));
    toast.success(`Applied ${sceneName} palette to tileset`);
  }, [options]);

  return { loadCustomFileUpload, loadSpritesFile, loadTGAFile, loadTilesetFile, loadPalette, changeTilesetPaletteScene };
}

function setPaletteFromManager(setCurrentPalette: Dispatch<SetStateAction<Palette>>, name: string): void {
  setCurrentPalette(paletteFromRgba(name, gMightyMikePalette.getPaletteAsRGBA()));
}

function updateTilesetData(loadedData: LoadedData, paletteColors: readonly RGBColor[]): LoadedData {
  if (loadedData?.type !== "tileset") return loadedData;
  const tileImages = rerenderTilesetWithPalette(loadedData.data, Array.from(paletteColors));
  return { ...loadedData, data: { ...loadedData.data, tileImages }, gridCanvas: createTilesetGridPreview({ ...loadedData.data, tileImages }) };
}

function updateLoadedTilesetPalette(setLoadedData: Dispatch<SetStateAction<LoadedData>>, sceneName: string): void {
  setLoadedData((loadedData) => updateTilesetData(loadedData, paletteFromRgba(sceneName, gMightyMikePalette.getPaletteAsRGBA()).colors));
}
