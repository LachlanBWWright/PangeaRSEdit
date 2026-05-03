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
import { plainObjectSchema, stringSchema } from "@/schemas/common";
import { z } from "zod";

function hexToUint8Array(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

const mightyMikeLevelDataSchema = z.object({
  tileset: z
    .object({
      tileImages: z.array(z.unknown()).optional(),
      numTileDefinitions: z.number().optional(),
      numTileAttributeEntries: z.number().optional(),
    })
    .optional(),
  Hedr: z
    .record(
      z.string(),
      z.object({
        obj: z
          .object({
            numTiles: z.number().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

function isMightyMikeLevelData(
  data: unknown,
): data is z.infer<typeof mightyMikeLevelDataSchema> {
  return mightyMikeLevelDataSchema.safeParse(data).success;
}

function extractTimgDataString(jsonData: unknown): string | undefined {
  const result = plainObjectSchema.safeParse(jsonData);
  if (!result.success) return undefined;
  const timg = result.data.Timg;

  const timgResult = plainObjectSchema.safeParse(timg);
  if (!timgResult.success) return undefined;
  const timg1000 = timgResult.data["1000"];

  const timg1000Result = plainObjectSchema.safeParse(timg1000);
  if (!timg1000Result.success) return undefined;
  const data = timg1000Result.data.data;

  const stringResult = stringSchema.safeParse(data);
  return stringResult.success ? stringResult.data : undefined;
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
    file,
    gameType,
    setData,
    rsrcName,
  );
  if (parseResult.isErr()) {
    toast.error("Failed to parse level data", {
      id: loadToastId,
      description: parseResult.error,
    });
    return;
  }
  const jsonData = parseResult.value;

  if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
    if (!isMightyMikeLevelData(jsonData)) {
      toast.error("Mighty Mike data has an unexpected format", {
        id: loadToastId,
      });
      return;
    }
    const tileImages = jsonData.tileset?.tileImages;
    if (!Array.isArray(tileImages) || tileImages.length === 0) {
      toast.error("No Mighty Mike tile images loaded", { id: loadToastId });
      return;
    }
    // Type assertion is safe here because tileImages came from deserialized GLB data
    setMapImagesFile(new File([new Uint8Array(0)], "mightyMike_tiles.bin"));
    setMapImages(tileImages as HTMLCanvasElement[]); // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion
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
    // Bugdom 1-specific - image data is embedded in the Resource Fork Timg field
    const imgString = extractTimgDataString(jsonData);
    if (!imgString) {
      toast.error("No embedded image data found", { id: loadToastId });
      console.error("[terrain] missing embedded Bugdom 1 image data", {
        gameName: gameType.GAME_NAME,
        url: rUrl,
      });
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
  toast.success("Level loaded", { id: loadToastId });
}
