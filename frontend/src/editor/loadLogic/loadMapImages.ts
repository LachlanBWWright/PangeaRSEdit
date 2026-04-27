import type { GlobalsInterface } from "@/data/globals/globals";
import {
  selectTerrainCodec,
  readTerrainTextureChunks,
} from "@/data/terrain-io/terrainCodec";
import { decodeTerrainChunks } from "@/data/terrain-io/terrainCodecWorkerClient";
import { assembleTerrainCanvases } from "@/data/terrain-io/terrainImageAssembly";
import { ok, err, type Result } from "neverthrow";

export async function loadMapImages(
  dataView: DataView,
  globals: GlobalsInterface,
  onProgress?: (progress: { completed: number; total: number }) => void,
): Promise<Result<HTMLCanvasElement[], string>> {
  const codecResult = selectTerrainCodec(globals);
  if (codecResult.isErr()) {
    console.error("[terrain] unsupported texture format", {
      gameName: globals.GAME_NAME,
      gameType: globals.GAME_TYPE,
      error: codecResult.error,
    });
    return err(codecResult.error.message);
  }

  console.info("[terrain] loadMapImages start", {
    gameName: globals.GAME_NAME,
    codec: codecResult.value.kind,
    supertileTexmapSize: codecResult.value.supertileTexmapSize,
    textureBytes: dataView.byteLength,
  });

  const chunksResult = readTerrainTextureChunks(dataView, codecResult.value);
  if (chunksResult.isErr()) {
    console.error("[terrain] failed to read texture chunks", {
      gameName: globals.GAME_NAME,
      error: chunksResult.error,
    });
    return err(chunksResult.error.message);
  }

  if (chunksResult.value.length === 0) {
    console.warn("[terrain] texture file contained no chunks", {
      gameName: globals.GAME_NAME,
      codec: codecResult.value.kind,
      textureBytes: dataView.byteLength,
    });
    return err("No terrain texture chunks were found in the texture file");
  }

  const decodedResult = await decodeTerrainChunks(
    codecResult.value,
    chunksResult.value,
    onProgress,
  );
  if (decodedResult.isErr()) {
    console.error("[terrain] terrain decode failed", {
      gameName: globals.GAME_NAME,
      error: decodedResult.error,
    });
    return err(decodedResult.error.message);
  }

  const assembledResult = assembleTerrainCanvases(decodedResult.value);
  if (assembledResult.isErr()) {
    console.error("[terrain] terrain assembly failed", {
      gameName: globals.GAME_NAME,
      error: assembledResult.error,
    });
    return err(assembledResult.error.message);
  }

  console.info("[terrain] loadMapImages complete", {
    gameName: globals.GAME_NAME,
    codec: codecResult.value.kind,
    chunks: chunksResult.value.length,
    canvases: assembledResult.value.length,
  });

  return ok(assembledResult.value);
}

/* else {
    //Budgdom 1 Logic - TODO: Not completed

    const mapImages: HTMLCanvasElement[] = [];
    //const mapImagesData: ArrayBuffer[] = new Array(numSupertiles);

    while (offset != dataView.byteLength) {
      numSupertiles++;

      const size =
        globals.SUPERTILE_TEXMAP_SIZE * globals.SUPERTILE_TEXMAP_SIZE * 2;
      const bufferSlice = new DataView(
        dataView.buffer.slice(offset, offset + size),
      );

      //const imgCanvas = document.createElement("canvas");
      const imgCanvas = document.createElement("canvas");
      imgCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
      imgCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
      const imgCtx = imgCanvas.getContext("2d");

      const imageData = imgCtx?.getImageData(
        0,
        0,
        imgCanvas.width,
        imgCanvas.height,
      );

      if (!imageData) {
        // Return error instead of throwing
        console.error("Could not create image data");
        return;
      }

      sixteenBitToImageData(bufferSlice, imageData);

      if (!imgCtx) {
        // Return error instead of throwing
        console.error("Bad data!");
        return;
      }
      //16-bit buffer from current buffer
      imgCtx?.putImageData(imageData, 0, 0);

      offset += size;
      imgCanvas;
      mapImages.push(imgCanvas);
    }
    return mapImages;
  } */
