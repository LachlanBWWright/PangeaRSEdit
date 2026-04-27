import type { GlobalsInterface } from "@/data/globals/globals";
import { selectTerrainCodec, readTerrainTextureChunks } from "@/data/terrain-io/terrainCodec";
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
    return err(codecResult.error.message);
  }

  const chunksResult = readTerrainTextureChunks(dataView, codecResult.value);
  if (chunksResult.isErr()) {
    return err(chunksResult.error.message);
  }

  const decodedResult = await decodeTerrainChunks(
    codecResult.value,
    chunksResult.value,
    onProgress,
  );
  if (decodedResult.isErr()) {
    return err(decodedResult.error.message);
  }

  const assembledResult = assembleTerrainCanvases(decodedResult.value);
  if (assembledResult.isErr()) {
    return err(assembledResult.error.message);
  }

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
