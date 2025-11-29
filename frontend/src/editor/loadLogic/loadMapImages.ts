import LzssWorker from "../../utils/lzssWorker?worker";
import JpegWorker from "../../utils/jpegDecompressWorker?worker";
import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import {
  JpegDecompressMessage,
  JpegDecompressResponse,
} from "@/utils/jpegDecompressWorker";
import { Game, type GlobalsInterface } from "@/data/globals/globals";

export async function loadMapImages(
  dataView: DataView,
  globals: GlobalsInterface,
) {
  let offset = 0;

  const loadPromise: Promise<HTMLCanvasElement[]> = new Promise((res, err) => {
    if (globals.GAME_TYPE === Game.NANOSAUR_2) {
      // Nanosaur 2: Each supertile is a JPEG, decompress with jpegDecompressWorker
      let offset = 0;
      let numSupertiles = 0;
      // First, count the number of JPEGs
      while (offset < dataView.byteLength) {
        const size = dataView.getInt32(offset);
        offset += 4;
        if (size === 0) break;

        console.log("Secondoffset", dataView.getInt32(offset));

        offset += size;

        numSupertiles++;
      }
      offset = 0;
      const mapImages: HTMLCanvasElement[] = new Array(numSupertiles);

      let resolvedTiles = 0;
      for (let i = 0; i < numSupertiles; i++) {
        let size = dataView.getInt32(offset);
        offset += 4;

        const imageDescriptionOffset = dataView.getInt32(offset);
        console.log("Image Description Offset", imageDescriptionOffset);
        offset += imageDescriptionOffset;
        size -= imageDescriptionOffset; // Adjust size to only include JPEG data, not the imageDescription record

        if (size === 0) break;
        const jpegArray = new Uint8Array(dataView.buffer, offset, size);
        const jpegBuffer = new Uint8Array(jpegArray).buffer; // This creates a new ArrayBuffer
        offset += size;

        // Use jpegDecompressWorker for off-main-thread decoding
        const jpegWorker = new JpegWorker();
        jpegWorker.onmessage = (e: MessageEvent<JpegDecompressResponse>) => {
          if (e.data.type !== "decompressRes") return;
          const imageData = e.data.imageData;

          const imgCanvas = document.createElement("canvas");
          imgCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
          imgCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
          const imgCtx = imgCanvas.getContext("2d");
          if (!imgCtx) {
            err("Bad data!");
            throw new Error("Bad data!");
          }
          imgCtx.putImageData(imageData, 0, 0);
          // Flip the canvas vertically
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = imgCanvas.width;
          tempCanvas.height = imgCanvas.height;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.translate(0, imgCanvas.height);
            tempCtx.scale(1, -1);
            tempCtx.drawImage(imgCanvas, 0, 0);
            imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
            imgCtx.drawImage(tempCanvas, 0, 0);
          }
          mapImages[i] = imgCanvas;
          resolvedTiles++;
          if (resolvedTiles === numSupertiles) {
            res(mapImages);
          }
          jpegWorker.terminate();
        };
        jpegWorker.postMessage({
          id: i,
          type: "decompress",
          jpegData: jpegBuffer,
        } satisfies JpegDecompressMessage);
      }
      return;
    }
    //Read Each - Logic for other games
    else {
      //Find the number of supertiles
      let numSupertiles = 0;
      while (offset != dataView.byteLength) {
        const size = dataView.getInt32(offset);
        offset += 4;
        if (size === 0) break;
        offset += size;
        numSupertiles++;
      }
      offset = 0; //Reset offset

      const mapImages: HTMLCanvasElement[] = new Array(numSupertiles);
      const resolvedTiles = { count: 0 };

      let supertileId = 0;
      while (offset < dataView.byteLength) {
        const size = dataView.getInt32(offset);

        offset += 4;
        const buffer = new DataView(
          dataView.buffer.slice(offset, offset + size),
        );
        const decompressedSize =
          globals.SUPERTILE_TEXMAP_SIZE * globals.SUPERTILE_TEXMAP_SIZE * 2;
        offset += size;

        const lzssWorker = new LzssWorker();
        lzssWorker.onmessage = (e: MessageEvent<LzssResponse>) => {
          const data = e.data;
          if (data.type !== "decompressRes") return;

          const imgCanvas = document.createElement("canvas");
          imgCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
          imgCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
          const imgCtx = imgCanvas.getContext("2d");

          if (!imgCtx) {
            err("Bad data!");
            throw new Error("Bad data!");
          }
          //16-bit buffer from current buffer
          imgCtx.putImageData(data.imageData, 0, 0);

          mapImages[data.id] = imgCanvas;

          resolvedTiles.count++;
          if (resolvedTiles.count === numSupertiles) {
            res(mapImages);
          }
          lzssWorker.terminate();
        };
        lzssWorker.postMessage({
          compressedDataView: buffer,
          outputSize: decompressedSize,
          type: "decompress",
          id: supertileId,
          width: globals.SUPERTILE_TEXMAP_SIZE,
          height: globals.SUPERTILE_TEXMAP_SIZE,
        } satisfies LzssMessage);
        supertileId++;
      }
      return [];
    }
  });
  const res = await loadPromise;
  return res;
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
        throw new Error("Could not create image data");
      }

      sixteenBitToImageData(bufferSlice, imageData);

      if (!imgCtx) {
        throw new Error("Bad data!");
      }
      //16-bit buffer from current buffer
      imgCtx?.putImageData(imageData, 0, 0);

      offset += size;
      imgCanvas;
      mapImages.push(imgCanvas);
    }
    return mapImages;
  } */
