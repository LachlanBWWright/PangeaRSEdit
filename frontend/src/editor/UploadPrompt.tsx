import { Globals, type GlobalsInterface } from "../data/globals/globals";
import { openFile } from "./loadLogic/openFile";
import { parseLevelDataFile } from "./loadLogic/parseLevelDataFile";

import { useAtom } from "jotai";
<<<<<<< HEAD
import { AtomicLevelData } from "../data/utils/levelDataUtils";
=======
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Updater } from "use-immer";
import { Buffer } from "buffer";
import { PyodideMessage, PyodideResponse } from "@/python/pyodideWorker";
>>>>>>> origin/main
import { IntroText } from "./IntroText";
import { GameCarousel } from "./gameCards/GameCarousel";
import type { TunnelData } from "@/data/tunnelParser/types";
/* import { Separator } from "@/components/ui/separator";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker"; //"../utils/bg3dGltfWorker.ts?worker"; */

export function UploadPrompt({
  setMapFile,
  setMapImagesFile,
  setMapImages,
  setData,
  setTunnelData,
  setTunnelFileName,
}: {
  mapFile: File | undefined;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
<<<<<<< HEAD
  setData: (data: AtomicLevelData) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
=======
  pyodideWorker: Worker;
  setData: Updater<ottoMaticLevel | null>;
>>>>>>> origin/main
}) {
  const [, setGlobals] = useAtom(Globals);

  const handleOpenFile = (url: string, gameType: GlobalsInterface) =>
    openFile({
      url,
      gameType,
      setGlobals,
      setMapFile,
      setMapImagesFile,
      setMapImages,
      setData,
    });

<<<<<<< HEAD
  const handleParseLevelDataFile = (file: Blob, gameType: GlobalsInterface) =>
    parseLevelDataFile(
      file,
      gameType,
      setData,
      undefined,
      setMapImages,
    );
=======
    const res = await fetch(rsrcName);
    const file = await res.blob();
    setMapFile(new File([file], name));

    if (gameType.DATA_TYPE === DataType.TRT_FILE) {
      //replace .ter at the end with .trt
      url = url.split(".")[0] + ".trt";
    }

    const jsonData = await parseLevelDataFile(file, gameType);

    // Nanosaur 1 Logic
    if (gameType.DATA_TYPE === DataType.TRT_FILE) {
      // Load the .trt file (terrain texture tileset)
      const imgRes = await fetch(url);
      const img = await imgRes.blob();
      const imgFile = new File([img], url.split("/").pop() ?? "");
      const imgBuffer = await imgFile.arrayBuffer();
      // Parse tiles using the new function (gets tile count from buffer)
      // Each tile is a Uint16Array of 32x32 pixels (16bpp ARGB1555)
      // You may want to convert these to canvases for display
      // Example: createCanvasFromTile(tile: Uint16Array)

      const tiles = parseNanosaurTerrainTextures(imgBuffer);

      // Convert each tile to a canvas for display
      const canvases = tiles.map(createCanvasFromTile);
      for (const canvas of canvases) {
        console.log(canvas.toDataURL("image/png"));
      }
      setMapImagesFile(imgFile);
      setMapImages(canvases);
    }
    //All other games
    else if (gameType.DATA_TYPE !== DataType.RSRC_FORK) {
      const imgRes = await fetch(url);
      const img = await imgRes.blob();
      const imgFile = new File([img], url.split("/").pop() ?? "");
      const imgBuffer = await imgFile.arrayBuffer();
      const imgDataView = new DataView(imgBuffer);
      const mapImages = await loadMapImages(imgDataView, gameType);

      setMapImagesFile(imgFile);
      setMapImages(mapImages);
    } else {
      //Bugdom 1-specific - The image data is within the Resource Fork
      console.log(jsonData);
      const imgString = jsonData.Timg[1000].data;
      console.log(imgString);
      const imgBuffer = Buffer.from(imgString, "hex");
      console.log("Image buffer length:", imgBuffer.byteLength);
      const tileCount = imgBuffer.byteLength / 2 / 32 / 32; // 2 bytes per pixel, 32x32 pixels per tile
      console.log("Tile count:", tileCount);

      const tiles = extractTilesFromBuffer(
        new DataView(imgBuffer.buffer),
        tileCount,
        32,
        32 * 32 * 2,
      );
      //test start

      // Convert each tile to a canvas for display
      const canvases = tiles.map(createCanvasFromTile);
      for (const canvas of canvases) {
        console.log(canvas.toDataURL("image/png"));
      }

      //test end

      console.log(imgBuffer);
      console.log(imgBuffer.byteLength);
      console.log("Resized", imgBuffer.byteLength / 2 / 32 / 32);
      const imgDataView = new DataView(imgBuffer.buffer);
      const mapImages = await loadMapImages(imgDataView, gameType);

      //Testing, delete
      for (const canvas of mapImages) {
        console.log(canvas.toDataURL("image/png"));
      }

      setMapImages(mapImages);
    }
  };

  const parseLevelDataFile = async (file: Blob, gameType: GlobalsInterface) => {
    const levelBuffer = await file.arrayBuffer();

    if (gameType.GAME_TYPE === Game.NANOSAUR) {
      // Nanosaur 1: parse with JS preprocessor
      // You may want to extract itemCount and offset from the buffer or pass as needed
      // For now, just return the parsed item list for demonstration
      // TODO: Integrate with your data model as needed
      //const itemCount = 0; // <-- set correct value
      const rawLevelData = parseNanosaur1Level(levelBuffer);
      const compatibleLevel = nanosaur1LevelToOttoMaticLevel(rawLevelData);
      // console.log(items);
      //setData(items as any); // or adapt to your data model
      //return items;

      //throw new Error("nanosaur terrain files are not supported yet");

      //TODO: Missing preprocessor
      setData(compatibleLevel); // or adapt to your data model
      return compatibleLevel;
    } else {
      //Call pyodide worker to  run the python code
      const pyodidePromise = new Promise<ottoMaticLevel>((resolve, reject) => {
        pyodideWorker.postMessage({
          type: "save_to_json",
          bytes: levelBuffer,
          struct_specs: gameType.STRUCT_SPECS,
          include_types: [],
          exclude_types: [],
        } satisfies PyodideMessage);

        pyodideWorker.onmessage = (event: MessageEvent<PyodideResponse>) => {
          console.log("Received message from pyodide worker:", event.data);
          if (event.data.type === "save_to_json") {
            resolve(event.data.result);
          } else {
            reject(new Error("Unexpected response from pyodide worker"));
          }
        };
      });

      const jsonData = await pyodidePromise;

      preprocessJson(jsonData, globals);

      setData(jsonData);
      return jsonData;
    }
  };
>>>>>>> origin/main

  return (
    <div className="flex text-white m-auto flex-1 gap-8 flex-col items-stretch justify-start p-8 min-h-0">
      <div className="w-full flex flex-col gap-4 items-center">
        <div className="flex flex-col gap-2 items-center w-full lg:w-3/4">
          <IntroText />
        </div>

        <div className="w-full flex-1 min-h-0">
          <GameCarousel
            showAllGames={true}
            handleOpenFile={handleOpenFile}
            handleParseLevelDataFile={handleParseLevelDataFile}
            setMapFile={setMapFile}
            setMapImagesFile={setMapImagesFile}
            setMapImages={setMapImages}
            setTunnelData={setTunnelData}
            setTunnelFileName={setTunnelFileName}
          />
        </div>
      </div>
    </div>
  );
}
