import { DataType } from "@/data/globals/globals";
import { loadMapImages } from "@/editor/loadLogic/loadMapImages";
import {
  parseNanosaurTerrainTextures,
  createCanvasFromTile,
  extractTilesFromBuffer,
} from "@/data/processors/classicProprocessor";
import { combineCanvases } from "@/editor/utils/combineCanvases";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { parseLevelDataFile } from "./parseLevelDataFile";

/**
 * Convert hex string to Uint8Array (browser-compatible)
 */
function hexToUint8Array(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

export interface OpenFileArgs {
  url: string;
  gameType: GlobalsInterface;
  setGlobals: (t: GlobalsInterface) => void;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setData: (d: AtomicLevelData) => void;
}

export async function openFile({
  url: rUrl,
  gameType,
  setGlobals,
  setMapFile,
  setMapImagesFile,
  setMapImages,
  setData,
}: OpenFileArgs) {
  let url = rUrl;
  let rsrcName: string;
  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    rsrcName = url;
  } else {
    rsrcName = gameType.DATA_TYPE !== DataType.TRT_FILE ? url + ".rsrc" : url;
  }
  const name = rsrcName.split("/").pop();
  if (!name) return;

  setGlobals(gameType);

  const res = await fetch(rsrcName);
  const file = await res.blob();
  setMapFile(new File([file], name));

  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    url = url.split(".")[0] + ".trt";
  }

  const parseResult = await parseLevelDataFile(
    file,
    gameType,
    setData,
    rsrcName, // Pass the URL for Mighty Mike tileset loading
  );
  if (parseResult.isErr()) {
    console.error(
      "Failed to parse level data:",
      parseResult.error?.message ?? parseResult.error,
    );
    return;
  }
  const jsonData = parseResult.value;

  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    console.log("=== MIGHTY_MIKE LEVEL LOADING ===");
    console.log("MightyMike level loaded successfully");
    console.log("jsonData type:", typeof jsonData);
    const jsonKeys = Object.keys(jsonData);
    console.log("jsonData keys:", jsonKeys);
    console.log("jsonData full object:", jsonData);

    // Extract tile images from tileset data using a block-scoped type guard
    function isMightyMikeLevelData(data: unknown): data is {
      tileset?: { tileImages?: HTMLCanvasElement[]; numTileDefinitions?: number; numTileAttributeEntries?: number };
      Hedr?: Record<string, { obj?: { numTiles?: number } }>;
    } {
      return typeof data === "object" && data !== null;
    }

    if (isMightyMikeLevelData(jsonData)) {
      const mmData: { 
        tileset?: { tileImages?: HTMLCanvasElement[]; numTileDefinitions?: number; numTileAttributeEntries?: number };
        Hedr?: Record<string, { obj?: { numTiles?: number } }>;
      } = jsonData;
      const tilesetData = mmData.tileset;
      const headerObj = mmData.Hedr?.["1000"]?.obj;
      const tileImages = tilesetData?.tileImages || [];

      console.log("Tileset data:", tilesetData);
      console.log(`MightyMike: Loaded ${tileImages.length} tile images from tileset`);
      console.log("MightyMike tileset data:", tilesetData ? {
        numTileDefinitions: tilesetData.numTileDefinitions || 0,
        numTileAttributeEntries: tilesetData.numTileAttributeEntries || 0,
        hasImages: !!tilesetData.tileImages,
        imageCount: tileImages.length,
      } : "No tileset data");
      console.log("MightyMike header data:", headerObj ? { numTiles: headerObj.numTiles } : "No header data");

      // Create and log tile images as a collage
      if (tileImages.length > 0) {
        const collage = combineCanvases(tileImages);
        const collageUrl = collage.toDataURL("image/png");
        console.log(`MightyMike tile collage: ${tileImages.length} tiles in color`, collageUrl);

        // Also create an image element to visualize in console
        const img = new Image();
        img.src = collageUrl;
        console.log("%cMightyMike Tile Collage Preview", "font-size: 16px; font-weight: bold; color: #4CAF50;");
        console.log(img);
      }

      if (tileImages.length === 0) {
        console.warn("MightyMike: No tile images loaded! Tileset may not have been parsed or tileImages array is empty.");
      }

      console.log("DEBUG: After setMapImages, tileImages.length =", tileImages.length);
      
      // Create a dummy file to allow downloads
      const dummyFile = new File([new Uint8Array(0)], "mightyMike_tiles.bin");
      setMapImagesFile(dummyFile);
      setMapImages(tileImages);
    } else {
      console.warn("MightyMike: parsed data doesn't match expected shape");
    }
  } else if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    const imgRes = await fetch(url);
    const img = await imgRes.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();

    const tiles = parseNanosaurTerrainTextures(imgBuffer);
    const canvases = tiles.map(createCanvasFromTile);
    const collage = combineCanvases(canvases);
    console.log("Collage dataURL:", collage.toDataURL("image/png"));
    setMapImagesFile(imgFile);
    setMapImages(canvases);
  } else if (gameType.DATA_TYPE !== DataType.RSRC_FORK) {
    const imgRes = await fetch(url);
    const img = await imgRes.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
    const imgDataView = new DataView(imgBuffer);
    const mapImagesResult = await loadMapImages(imgDataView, gameType);
    if (mapImagesResult.isErr()) {
      console.error(
        "Failed to load map images:",
        mapImagesResult.error.message,
      );
      return;
    }
    setMapImagesFile(imgFile);
    setMapImages(mapImagesResult.value);
  } else {
    // Bugdom 1-specific - The image data is within the Resource Fork
    // Dynamic JSON structure from parse result; coerce to Record types (keep safe cast)
    // Helper to safely access Timg data
    function isRecord(value: unknown): value is Record<string, unknown> {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
    
    let imgString: string | undefined;
    if (isRecord(jsonData) && isRecord(jsonData.Timg) && isRecord(jsonData.Timg["1000"])) {
      const data = jsonData.Timg["1000"].data;
      if (typeof data === 'string') {
        imgString = data;
      }
    }
    if (!imgString) {
      console.error("No image data found");
      return;
    }
    const imgBuffer = hexToUint8Array(imgString);
    const alignedBuffer = new ArrayBuffer(imgBuffer.byteLength);
    new Uint8Array(alignedBuffer).set(imgBuffer);
    const tileCount = imgBuffer.byteLength / 2 / 32 / 32;
    const tiles = extractTilesFromBuffer(
      new DataView(alignedBuffer),
      tileCount,
      32,
      32 * 32 * 2,
    );
    const canvases = tiles.map(createCanvasFromTile);
    const collage = combineCanvases(canvases);
    console.log(collage.toDataURL("image/png"));
    // Create a synthetic images file so download/save code that expects a
    // separate images file continues to work (e.g., Download validation).
    // Use the map filename base to create a reasonable tiles filename.
    const baseName = name ? name.split(".")[0] : "bugdom";
    const syntheticImagesFile = new File([alignedBuffer], `${baseName}_tiles.bin`);
    setMapImagesFile(syntheticImagesFile);
    setMapImages(canvases);
  }
}
