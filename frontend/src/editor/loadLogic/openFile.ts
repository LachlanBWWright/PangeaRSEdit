import { Buffer } from "buffer";
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

export type OpenFileArgs = {
  url: string;
  gameType: GlobalsInterface;
  setGlobals: (t: GlobalsInterface) => void;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  pyodideWorker: Worker;
  setData: (d: AtomicLevelData) => void;
};

export async function openFile({
  url: rUrl,
  gameType,
  setGlobals,
  setMapFile,
  setMapImagesFile,
  setMapImages,
  pyodideWorker,
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
    pyodideWorker,
    setData,
    rsrcName, // Pass the URL for Mighty Mike tileset loading
  );
  if (!parseResult.ok) {
    console.error(
      "Failed to parse level data:",
      parseResult.error?.message ?? parseResult.error,
    );
    return;
  }
  const jsonData = parseResult.value;

  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    console.log("MightyMike level loaded successfully with tileset integration");
    // Create a dummy file for now to allow downloads
    // TODO: Load and display tileset images
    const dummyFile = new File([new Uint8Array(0)], "mightyMike_tiles.bin");
    setMapImagesFile(dummyFile);
    setMapImages([]);
  } else if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    const imgRes = await fetch(url);
    const img = await imgRes.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();

    const tiles = parseNanosaurTerrainTextures(imgBuffer);
    const canvases = tiles.map(createCanvasFromTile);
    try {
      const collage = combineCanvases(canvases);
      console.log("Collage dataURL:", collage.toDataURL("image/png"));
    } catch (err) {
      console.warn("Failed to create collage:", err);
    }
    setMapImagesFile(imgFile);
    setMapImages(canvases);
  } else if (gameType.DATA_TYPE !== DataType.RSRC_FORK) {
    const imgRes = await fetch(url);
    const img = await imgRes.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
    const imgDataView = new DataView(imgBuffer);
    const mapImagesResult = await loadMapImages(imgDataView, gameType);
    if (!mapImagesResult.ok) {
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
    const imgString = (
      jsonData as unknown as { Timg?: Record<string, { data?: string }> }
    ).Timg?.["1000"]?.data as string | undefined;
    if (!imgString) {
      console.error("No image data found");
      return;
    }
    const imgBuffer = Buffer.from(imgString, "hex");
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
    try {
      const collage = combineCanvases(canvases);
      console.log(collage.toDataURL("image/png"));
    } catch (err) {
      console.warn("Failed to create collage:", err);
    }
    setMapImages(canvases);
  }
}
