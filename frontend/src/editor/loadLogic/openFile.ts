import { DataType } from "@/data/globals/globals";
import { loadMapImages } from "@/editor/loadLogic/loadMapImages";
import { imagePayloadsToCanvases } from "@/data/level-io/terrainImageSnapshots";
import { parseNanosaurTerrainWithWorker } from "@/data/level-io/nanosaurTerrainWorkerClient";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { parseLevelDataFile } from "./parseLevelDataFile";
import { toast } from "sonner";
import { fetchAsset } from "@/assets/fetchAsset";
import { getAssetState } from "@/assets/assetState";
import { splitLevelData } from "@/data/utils/levelDataUtils";

export interface OpenFileArgs {
  url: string;
  gameType: GlobalsInterface;
  setGlobals: (t: GlobalsInterface) => void;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setData: (d: AtomicLevelData) => void;
}

let latestOpen = 0;

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
  const request = ++latestOpen;
  const revision = getAssetState().revision;
  let url = rUrl;
  let rsrcName: string;
  const loadToastId = "open-level-progress";
  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    rsrcName = url;
  } else {
    rsrcName = gameType.DATA_TYPE !== DataType.TRT_FILE ? url + ".rsrc" : url;
  }
  const name = rsrcName.split("/").pop();
  if (!name) return;

  toast.loading("Loading level files...", {
    id: loadToastId,
    description: name,
  });

  const levelResponseResult = await fetchAsset(rsrcName);
  if (levelResponseResult.isErr()) {
    toast.error("Failed to download level file", {
      id: loadToastId,
      description: levelResponseResult.error.message,
    });
    return;
  }
  const file = new Blob([levelResponseResult.value]);

  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    url = getTrtTextureUrl(url);
  }

  toast.loading("Parsing level data...", {
    id: loadToastId,
    description: name,
  });

  const parseResult = await parseLevelDataFile(
    {
      file,
      gameType,
      fileUrl: rsrcName,
      onProgress: ({ message }) => {
        toast.loading(message, {
          id: loadToastId,
          description: name,
        });
      },
    },
  );
  if (parseResult.isErr()) {
    toast.error("Failed to parse level data", {
      id: loadToastId,
      description: parseResult.error,
    });
    return;
  }
  const parsedLevel = parseResult.value;
  if (request !== latestOpen || revision !== getAssetState().revision) return;

  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    if (parsedLevel.mapImages.length === 0) {
      toast.error("No Mighty Mike tile images loaded", { id: loadToastId });
      return;
    }
    if (parsedLevel.mapImagesFile) {
      setMapImagesFile(parsedLevel.mapImagesFile);
    }
    setMapImages([...parsedLevel.mapImages]);
  } else if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    toast.loading("Loading terrain textures...", {
      id: loadToastId,
      description: url,
    });
    const imgResResult = await fetchAsset(url);
    if (imgResResult.isErr()) {
      toast.error("Failed to download texture file", {
        id: loadToastId,
        description: url,
      });
      console.error("[terrain] failed to download TRT texture file", {
        gameName: gameType.GAME_NAME,
        url,
        error: imgResResult.error.message,
      });
      return;
    }
    const imgBuffer = imgResResult.value;
    const imgFile = new File([imgBuffer], url.split("/").pop() ?? "");
    toast.loading("Decoding terrain textures...", {
      id: loadToastId,
      description: imgFile.name,
    });
    const tilesResult = await parseNanosaurTerrainWithWorker(imgBuffer);
    if (tilesResult.isErr() || tilesResult.value.length === 0) {
      toast.error("No terrain textures decoded", {
        id: loadToastId,
        description: imgFile.name,
      });
      console.error("[terrain] decoded zero Nanosaur texture tiles", {
        gameName: gameType.GAME_NAME,
        fileName: imgFile.name,
        textureBytes: imgBuffer.byteLength,
      });
      return;
    }
    const canvasesResult = imagePayloadsToCanvases(
      tilesResult.value,
    );
    if (canvasesResult.isErr()) {
      toast.error("Failed to materialize terrain textures", {
        id: loadToastId,
        description: canvasesResult.error,
      });
      return;
    }
    console.info("[terrain] decoded Nanosaur texture tiles", {
      gameName: gameType.GAME_NAME,
      fileName: imgFile.name,
      tileCount: tilesResult.value.length,
    });
    if (request !== latestOpen || revision !== getAssetState().revision) return;
    setMapImagesFile(imgFile);
    setMapImages(canvasesResult.value);
  } else if (gameType.DATA_TYPE !== DataType.RSRC_FORK) {
    const imgResResult = await fetchAsset(url);
    if (imgResResult.isErr()) {
      toast.error("Failed to download texture file", {
        id: loadToastId,
        description: url,
      });
      console.error("[terrain] failed to download texture file", {
        gameName: gameType.GAME_NAME,
        url,
        error: imgResResult.error.message,
      });
      return;
    }
    const imgBuffer = imgResResult.value;
    const imgFile = new File([imgBuffer], url.split("/").pop() ?? "");
    toast.loading("Decoding terrain textures...", {
      id: loadToastId,
      description: imgFile.name,
    });

    let lastReportedPercent = 0;
    const mapImagesResult = await loadMapImages(
      new DataView(imgBuffer),
      gameType,
      ({ completed, total }) => {
        if (total <= 0) {
          return;
        }
        const percent = Math.floor((completed / total) * 100);
        if (percent === lastReportedPercent || percent % 10 !== 0) {
          return;
        }
        lastReportedPercent = percent;
        toast.loading("Decoding terrain textures...", {
          id: loadToastId,
          description: `${completed}/${total} supertiles (${percent}%)`,
        });
      },
    );
    if (mapImagesResult.isErr()) {
      toast.error("Failed to load map images", {
        id: loadToastId,
        description: mapImagesResult.error,
      });
      console.error("[terrain] terrain texture decode failed", {
        gameName: gameType.GAME_NAME,
        url,
        error: mapImagesResult.error,
      });
      return;
    }
    if (request !== latestOpen || revision !== getAssetState().revision) return;
    toast.success("Terrain textures decoded", {
      id: loadToastId,
      description: `${mapImagesResult.value.length} supertiles`,
    });
    setMapImagesFile(imgFile);
    setMapImages(mapImagesResult.value);
  } else {
    if (parsedLevel.mapImages.length === 0) {
      toast.error("No embedded image data found", { id: loadToastId });
      return;
    }
    const baseName = name.split(".")[0];
    setMapImagesFile(new File([], `${baseName}_tiles.bin`));
    setMapImages([...parsedLevel.mapImages]);
  }
  setGlobals(gameType);
  setMapFile(new File([file], name));
  setData(splitLevelData(parsedLevel.levelData));
  toast.success("Level loaded", { id: loadToastId });
}
