import { FileUpload } from "../components/FileUpload";
// image decompression moved to `loadLogic/loadMapImages`
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  DataType,
  Game,
  Globals,
  Nanosaur2Globals,
  OttoGlobals,
  type GlobalsInterface,
} from "../data/globals/globals";
import { loadMapImages } from "./loadLogic/loadMapImages";

import { useAtom } from "jotai";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { splitLevelData, AtomicLevelData } from "../data/utils/levelDataUtils";
import { Buffer } from "buffer";
import { PyodideMessage, PyodideResponse } from "@/python/pyodideWorker";
import { IntroText } from "./IntroText";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import {
  nanosaur1LevelToOttoMaticLevel,
  parseNanosaur1Level,
  parseNanosaurTerrainTextures,
  createCanvasFromTile,
  extractTilesFromBuffer,
} from "@/data/processors/classicProprocessor";
// Level grids moved to `gameLevelSelectors/*`
import OttoLevels from "./gameLevelSelectors/OttoLevels";
import BugdomLevels from "./gameLevelSelectors/BugdomLevels";
import Bugdom2Levels from "./gameLevelSelectors/Bugdom2Levels";
import CroMagLevels from "./gameLevelSelectors/CroMagLevels";
import NanosaurLevels from "./gameLevelSelectors/NanosaurLevels";
import Nanosaur2Levels from "./gameLevelSelectors/Nanosaur2Levels";
import BillyFrontierLevels from "./gameLevelSelectors/BillyFrontierLevels";
/* import { Separator } from "@/components/ui/separator";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrc";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker"; //"../utils/bg3dGltfWorker.ts?worker"; */

export function UploadPrompt({
  mapFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
  pyodideWorker,
  setData,
}: {
  mapFile: File | undefined;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  pyodideWorker: Worker;
  setData: (data: AtomicLevelData) => void;
}) {
  const [globals, setGlobals] = useAtom(Globals);
  const [showAllGames, setShowAllGames] = useState(false);
  const openFile = async (url: string, gameType: GlobalsInterface) => {
    /*All games' Resource Forks are .ter.rsrc, except for Nanosaur, which stores data in a .ter using a proprietary format
    Terrain files are .ter, except for Nanosaur, which is .trt, and Bugdom, 
    where there is no separate image file, as it's just in the Resource Fork
    */
    const rsrcName =
      gameType.DATA_TYPE !== DataType.TRT_FILE ? url + ".rsrc" : url;
    const name = rsrcName.split("/").pop();
    if (!name) return;

    setGlobals(gameType);

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
      const imgString = jsonData.Timg?.[1000]?.data;
      console.log(imgString);
      if (!imgString) {
        throw new Error("No image data found");
      }
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
      //setData(items); // or adapt to your data model
      //return items;

      //throw new Error("nanosaur terrain files are not supported yet");

      //TODO: Missing preprocessor
      setData(splitLevelData(compatibleLevel)); // or adapt to your data model
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

      setData(splitLevelData(jsonData));
      return jsonData;
    }
  };

  return (
    <div className="flex text-white m-auto flex-1 gap-8 flex-col items-center justify-center p-8">
      <div className="flex flex-col gap-2 lg:w-1/2">
        <IntroText />
        <div className="flex flex-row justify-center gap-2 items-center">
          <p>Show non-functional games</p>
          <Switch checked={showAllGames} onCheckedChange={setShowAllGames} />
        </div>
      </div>
      <div className="flex flex-col gap-2 lg:w-1/3">
        <p>Select Game</p>
        <Select>
          <SelectTrigger className="min-w-fit">
            <SelectValue placeholder="Otto Matic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="ottoMatic"
              onClick={() => setGlobals(OttoGlobals)}
            >
              Otto Matic
            </SelectItem>
            <SelectItem
              value="budgdom2"
              onClick={() => setGlobals(Bugdom2Globals)}
            >
              Bugdom 2
            </SelectItem>
            <SelectItem
              value="croMag"
              onClick={() => setGlobals(CroMagGlobals)}
            >
              Cro-Mag Rally
            </SelectItem>
            <SelectItem
              value="nanosaur2"
              onClick={() => setGlobals(Nanosaur2Globals)}
            >
              Nanosaur 2
            </SelectItem>
            <SelectItem
              value="billyFrontier"
              onClick={() => setGlobals(BillyFrontierGlobals)}
            >
              Billy Frontier
            </SelectItem>
          </SelectContent>
        </Select>
        <p>Upload Level Data (.ter.rsrc)</p>
        <FileUpload
          className="text-2xl"
          acceptType=".ter.rsrc"
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            setMapFile(file);
            parseLevelDataFile(file, OttoGlobals);
          }}
        />
        <p>Upload Texture Data (.ter)</p>
        <FileUpload
          className="text-2xl"
          acceptType=".ter"
          disabled={!mapFile}
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;
            const mapImagesFile = e.target.files[0];
            const buffer = await mapImagesFile.arrayBuffer();

            //Uses Big Endian by default - Which is what Otto uses
            const dataView = new DataView(buffer);

            const mapImages = await loadMapImages(dataView, globals);
            setMapImagesFile(mapImagesFile);
            setMapImages(mapImages);
          }}
        />
      </div>

      <div className="flex flex-row gap-8 overflow-x-auto flex-wrap justify-center max-w-full  ">
        <OttoLevels openFile={openFile} />
        {showAllGames && (
          <>
            <BugdomLevels openFile={openFile} />
            <Bugdom2Levels openFile={openFile} />
            <CroMagLevels openFile={openFile} />
            <NanosaurLevels openFile={openFile} />
            <Nanosaur2Levels openFile={openFile} />
            <BillyFrontierLevels openFile={openFile} />
          </>
        )}
      </div>
    </div>
  );
}
