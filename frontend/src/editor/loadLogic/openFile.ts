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
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";

function hexToUint8Array(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

interface MightyMikeLevelData {
  tileset?: {
    tileImages?: HTMLCanvasElement[];
    numTileDefinitions?: number;
    numTileAttributeEntries?: number;
  };
  Hedr?: Record<string, { obj?: { numTiles?: number } }>;
}

function isMightyMikeLevelData(data: unknown): data is MightyMikeLevelData {
  return typeof data === "object" && data !== null;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractTimgDataString(jsonData: unknown): string | undefined {
  if (!isJsonRecord(jsonData)) return undefined;
  const timg = jsonData.Timg;
  if (!isJsonRecord(timg)) return undefined;
  const timg1000 = timg["1000"];
  if (!isJsonRecord(timg1000)) return undefined;
  const data = timg1000.data;
  return typeof data === "string" ? data : undefined;
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

  const levelResponseResult = await ResultAsync.fromPromise(
    fetch(rsrcName),
    mapErr,
  );
  if (levelResponseResult.isErr()) {
    toast.error("Failed to download level file", { description: rsrcName });
    return;
  }
  const levelResponse = levelResponseResult.value;
  if (!levelResponse.ok) {
    toast.error("Failed to download level file", { description: rsrcName });
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
    rsrcName,
  );
  if (parseResult.isErr()) {
    toast.error("Failed to parse level data", {
      description: parseResult.error?.message ?? String(parseResult.error),
    });
    return;
  }
  const jsonData = parseResult.value;

  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    if (!isMightyMikeLevelData(jsonData)) {
      toast.error("Mighty Mike data has an unexpected format");
      return;
    }
    const tileImages = jsonData.tileset?.tileImages ?? [];
    if (tileImages.length === 0)
      toast.error("No Mighty Mike tile images loaded");
    setMapImagesFile(new File([new Uint8Array(0)], "mightyMike_tiles.bin"));
    setMapImages(tileImages);
  } else if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    const imgResResult = await ResultAsync.fromPromise(fetch(url), mapErr);
    if (imgResResult.isErr() || !imgResResult.value.ok) {
      toast.error("Failed to download texture file", { description: url });
      return;
    }
    const img = await imgResResult.value.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
    const tiles = parseNanosaurTerrainTextures(imgBuffer);
    setMapImagesFile(imgFile);
    setMapImages(tiles.map(createCanvasFromTile));
  } else if (gameType.DATA_TYPE !== DataType.RSRC_FORK) {
    const imgResResult = await ResultAsync.fromPromise(fetch(url), mapErr);
    if (imgResResult.isErr() || !imgResResult.value.ok) {
      toast.error("Failed to download texture file", { description: url });
      return;
    }
    const img = await imgResResult.value.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
    const mapImagesResult = await loadMapImages(
      new DataView(imgBuffer),
      gameType,
    );
    if (mapImagesResult.isErr()) {
      toast.error("Failed to load map images", {
        description: mapImagesResult.error.message,
      });
      return;
    }
    setMapImagesFile(imgFile);
    setMapImages(mapImagesResult.value);
  } else {
    // Bugdom 1-specific - image data is embedded in the Resource Fork Timg field
    const imgString = extractTimgDataString(jsonData);
    if (!imgString) {
      toast.error("No embedded image data found");
      return;
    }
    const imgBuffer = hexToUint8Array(imgString);
    const alignedBuffer = new ArrayBuffer(imgBuffer.byteLength);
    new Uint8Array(alignedBuffer).set(imgBuffer);
    const tileCount = imgBuffer.byteLength / 2 / 32 / 32;
    const tileView = new DataView(alignedBuffer);
    const tiles = extractTilesFromBuffer(tileView, tileCount, 32, 32 * 32 * 2);
    const baseName = name.split(".")[0];
    setMapImagesFile(new File([alignedBuffer], `${baseName}_tiles.bin`));
    setMapImages(tiles.map(createCanvasFromTile));
  }
  toast.success("Level loaded");
}
