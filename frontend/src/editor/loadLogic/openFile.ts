import { DataType } from "@/data/globals/globals";
import { loadMapImages } from "@/editor/loadLogic/loadMapImages";
import {
  parseNanosaurTerrainTextures,
  createCanvasFromTile,
  extractTilesFromBuffer,
} from "@/data/processors/classicProprocessor";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { parseLevelDataFile } from "./parseLevelDataFile";
import { toast } from "sonner";

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

export function getTrtTextureUrl(levelUrl: string): string {
  const baseUrl = levelUrl.replace(/\.ter$/i, "");
  if (baseUrl.endsWith("Level1Pro")) {
    return `${baseUrl.slice(0, -"Pro".length)}.trt`;
  }
  return `${baseUrl}.trt`;
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
  setMapImages([]);

  const levelResponse = await fetch(rsrcName).catch(() => null);
  if (!levelResponse || !levelResponse.ok) {
    toast.error("Failed to download level file", {
      description: rsrcName,
    });
    return;
  }
  const file = await levelResponse.blob();
  setMapFile(new File([file], name));

  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    url = getTrtTextureUrl(url);
  }

  const parseResult = await parseLevelDataFile(
    file,
    gameType,
    setData,
    rsrcName, // Pass the URL for Mighty Mike tileset loading
  );
  if (parseResult.isErr()) {
    toast.error("Failed to parse level data", {
      description: parseResult.error?.message ?? String(parseResult.error),
    });
    return;
  }
  const jsonData = parseResult.value;

  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
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
      const tileImages = tilesetData?.tileImages || [];

      if (tileImages.length === 0) {
        toast.error("No Mighty Mike tile images loaded");
      }
      
      // Create a dummy file to allow downloads
      const dummyFile = new File([new Uint8Array(0)], "mightyMike_tiles.bin");
      setMapImagesFile(dummyFile);
      setMapImages(tileImages);
    } else {
      toast.error("Mighty Mike data has an unexpected format");
    }
  } else if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    const imgRes = await fetch(url).catch(() => null);
    if (!imgRes || !imgRes.ok) {
      toast.error("Failed to download texture file", {
        description: url,
      });
      return;
    }
    const img = await imgRes.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();

    const tiles = parseNanosaurTerrainTextures(imgBuffer);
    const canvases = tiles.map(createCanvasFromTile);
    setMapImagesFile(imgFile);
    setMapImages(canvases);
  } else if (gameType.DATA_TYPE !== DataType.RSRC_FORK) {
    const imgRes = await fetch(url).catch(() => null);
    if (!imgRes || !imgRes.ok) {
      toast.error("Failed to download texture file", {
        description: url,
      });
      return;
    }
    const img = await imgRes.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
    const imgDataView = new DataView(imgBuffer);
    const mapImagesResult = await loadMapImages(imgDataView, gameType);
    if (mapImagesResult.isErr()) {
      toast.error("Failed to load map images", {
        description: mapImagesResult.error.message,
      });
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
      toast.error("No embedded image data found");
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
    // Create a synthetic images file so download/save code that expects a
    // separate images file continues to work (e.g., Download validation).
    // Use the map filename base to create a reasonable tiles filename.
    const baseName = name ? name.split(".")[0] : "bugdom";
    const syntheticImagesFile = new File([alignedBuffer], `${baseName}_tiles.bin`);
    setMapImagesFile(syntheticImagesFile);
    setMapImages(canvases);
  }
  toast.success("Level loaded");
}
