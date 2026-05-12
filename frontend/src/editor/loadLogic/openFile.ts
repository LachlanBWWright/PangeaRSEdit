import { DataType } from "@/data/globals/globals";
import { loadMapImages } from "@/editor/loadLogic/loadMapImages";
import {
  parseNanosaurTerrainTextures,
  createCanvasFromTile,
} from "@/data/processors/classicProprocessor";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { parseLevelDataFile } from "./parseLevelDataFile";
import { toast } from "sonner";
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";
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
  const loadToastId = "open-level-progress";
  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    rsrcName = url;
  } else {
    rsrcName = gameType.DATA_TYPE !== DataType.TRT_FILE ? url + ".rsrc" : url;
  }
  const name = rsrcName.split("/").pop();
  if (!name) return;

  setGlobals(gameType);
  toast.loading("Loading level files...", {
    id: loadToastId,
    description: name,
  });

  const levelResponseResult = await ResultAsync.fromPromise(
    fetch(rsrcName),
    mapErr,
  );
  if (levelResponseResult.isErr()) {
    toast.error("Failed to download level file", {
      id: loadToastId,
      description: rsrcName,
    });
    return;
  }
  const levelResponse = levelResponseResult.value;
  if (!levelResponse.ok) {
    toast.error("Failed to download level file", {
      id: loadToastId,
      description: rsrcName,
    });
    return;
  }
  const file = await levelResponse.blob();
  setMapFile(new File([file], name));

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
  setData(splitLevelData(parsedLevel.levelData));

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
    const imgResResult = await ResultAsync.fromPromise(fetch(url), mapErr);
    if (imgResResult.isErr() || !imgResResult.value.ok) {
      toast.error("Failed to download texture file", {
        id: loadToastId,
        description: url,
      });
      console.error("[terrain] failed to download TRT texture file", {
        gameName: gameType.GAME_NAME,
        url,
        error: imgResResult.isErr()
          ? imgResResult.error
          : imgResResult.value.status,
      });
      return;
    }
    const img = await imgResResult.value.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
    toast.loading("Decoding terrain textures...", {
      id: loadToastId,
      description: imgFile.name,
    });
    const tiles = parseNanosaurTerrainTextures(imgBuffer);
    if (tiles.length === 0) {
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
    console.info("[terrain] decoded Nanosaur texture tiles", {
      gameName: gameType.GAME_NAME,
      fileName: imgFile.name,
      tileCount: tiles.length,
    });
    setMapImagesFile(imgFile);
    setMapImages(tiles.map(createCanvasFromTile));
  } else if (gameType.DATA_TYPE !== DataType.RSRC_FORK) {
    const imgResResult = await ResultAsync.fromPromise(fetch(url), mapErr);
    if (imgResResult.isErr() || !imgResResult.value.ok) {
      toast.error("Failed to download texture file", {
        id: loadToastId,
        description: url,
      });
      console.error("[terrain] failed to download texture file", {
        gameName: gameType.GAME_NAME,
        url,
        error: imgResResult.isErr()
          ? imgResResult.error
          : imgResResult.value.status,
      });
      return;
    }
    const img = await imgResResult.value.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
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
  toast.success("Level loaded", { id: loadToastId });
}
