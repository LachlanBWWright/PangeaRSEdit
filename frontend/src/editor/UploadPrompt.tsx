import { FileUpload } from "../components/FileUpload";
// image decompression moved to `loadLogic/loadMapImages`
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  DataType,
  Game,
  Globals,
  MightyMikeGlobals,
  Nanosaur2Globals,
  OttoGlobals,
  type GlobalsInterface,
} from "../data/globals/globals";
import { loadMapImages } from "./loadLogic/loadMapImages";
import { combineCanvases } from "./utils/combineCanvases";

import { useAtom } from "jotai";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import {
  parseMightyMikeTileSet,
  parseMightyMikeMap,
  parseMightyMikeLevel,
} from "../modelParsers/parseMightyMike";
import type { MightyMikeLevel } from "../python/structSpecs/mightyMikeInterface";
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
import Bugdom2Levels from "./gameLevelSelectors/BugdomLevels";
import CroMagLevels from "./gameLevelSelectors/CroMagLevels";
import NanosaurLevels from "./gameLevelSelectors/NanosaurLevels";
import Nanosaur2Levels from "./gameLevelSelectors/Nanosaur2Levels";
import BillyFrontierLevels from "./gameLevelSelectors/BillyFrontierLevels";
import MightyMikeLevels from "./gameLevelSelectors/MightyMikeLevels";
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
    MightyMike uses .map files directly
    */
    let rsrcName: string;
    if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
      rsrcName = url; // .map files are used directly
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
      //replace .ter at the end with .trt
      url = url.split(".")[0] + ".trt";
    }

    const jsonData = await parseLevelDataFile(file, gameType);

    // Handle different image loading logic per game type
    if (gameType.DATA_TYPE === DataType.MIGHTY_MIKE) {
      // MightyMike doesn't have separate image files - tiles are defined in tileset
      // TODO: Load tileset file and create tile canvases
      console.log("MightyMike level loaded - tileset integration pending");
      setMapImages([]); // No images for now
    } else if (gameType.DATA_TYPE === DataType.TRT_FILE) {
      // Nanosaur 1: Load the .trt file (terrain texture tileset)
      const imgRes = await fetch(url);
      const img = await imgRes.blob();
      const imgFile = new File([img], url.split("/").pop() ?? "");
      const imgBuffer = await imgFile.arrayBuffer();

      const tiles = parseNanosaurTerrainTextures(imgBuffer);

      // Convert each tile to a canvas for display
      const canvases = tiles.map(createCanvasFromTile);
      for (const canvas of canvases) {
        console.log(canvas.toDataURL("image/png"));
      }

      // Combine tiles into a single collage and log its data URL
      try {
        const collage = combineCanvases(canvases);
        console.log("Collage dataURL:", collage.toDataURL("image/png"));
      } catch (err) {
        console.warn("Failed to create collage:", err);
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
      //Bugdom 1-specific - The image data is within the Resource Fork
      console.log(jsonData);
      const imgString = jsonData.Timg?.[1000]?.data;
      console.log(
        "Timg hex string (first 200 chars):",
        imgString?.substring(0, 200),
      );
      console.log("Timg hex string length:", imgString?.length);
      if (!imgString) {
        console.error("No image data found");
        return;
      }
      const imgBuffer = Buffer.from(imgString, "hex");
      console.log("Image buffer length:", imgBuffer.byteLength);
      console.log("Image buffer byteOffset:", imgBuffer.byteOffset);

      // Log first 32 bytes as hex to see raw data
      const first32Bytes = Array.from(imgBuffer.slice(0, 32))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      console.log("First 32 bytes of Timg:", first32Bytes);

      // Log first 8 pixels as 16-bit values (big-endian)
      const alignedBuffer = new ArrayBuffer(imgBuffer.byteLength);
      new Uint8Array(alignedBuffer).set(imgBuffer);
      const tempView = new DataView(alignedBuffer);
      const first8Pixels = [];
      for (let i = 0; i < 8; i++) {
        const val = tempView.getUint16(i * 2, false); // big-endian
        first8Pixels.push({
          hex: "0x" + val.toString(16).padStart(4, "0"),
          decimal: val,
        });
      }
      console.log("First 8 pixels as 16-bit big-endian:", first8Pixels);

      const tileCount = imgBuffer.byteLength / 2 / 32 / 32; // 2 bytes per pixel, 32x32 pixels per tile
      console.log("Tile count:", tileCount);

      const tiles = extractTilesFromBuffer(
        new DataView(alignedBuffer),
        tileCount,
        32,
        32 * 32 * 2,
      );

      // Debug: Log first tile's first 8 raw pixel values
      const firstTile = tiles[0];
      if (tiles.length > 0 && firstTile) {
        console.log(
          "First tile, first 8 raw Uint16 values:",
          Array.from(firstTile.slice(0, 8)),
        );
      }
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

      // We already converted tiles to canvases above using `createCanvasFromTile`.
      // `loadMapImages` does not currently implement Bugdom decoding and will
      // return an empty array. Use the canvases we already created instead.
      // Combine tiles into a single collage and log its data URL
      try {
        const collage = combineCanvases(canvases);
        console.log(collage.toDataURL("image/png"));
      } catch (err) {
        console.warn("Failed to create collage:", err);
      }

      console.log("Bugdom tile images loaded:", canvases.length, "tiles");
      console.log(
        "First 3 tile image dimensions:",
        canvases.slice(0, 3).map((c) => `${c.width}x${c.height}`),
      );
      setMapImages(canvases);
      console.log("setMapImages called with", canvases.length, "canvases");
    }
  };

  const parseLevelDataFile = async (file: Blob, gameType: GlobalsInterface) => {
    const levelBuffer = await file.arrayBuffer();

    if (gameType.GAME_TYPE === Game.NANOSAUR) {
      // Nanosaur 1: parse with JS preprocessor
      const rawLevelData = parseNanosaur1Level(levelBuffer);
      const compatibleLevel = nanosaur1LevelToOttoMaticLevel(rawLevelData);

      setData(splitLevelData(compatibleLevel));
      return compatibleLevel;
    } else if (gameType.GAME_TYPE === Game.MIGHTY_MIKE) {
      // MightyMike: parse with TypeScript parser
      // For now, assume the file is a .map file and we need to load tileset separately
      // TODO: Handle loading both .tileset and .map files
      const mapResult = parseMightyMikeMap(levelBuffer);
      if (!mapResult.ok) {
        throw new Error(`Failed to parse MightyMike map: ${mapResult.error}`);
      }

      // For now, return a basic structure that can be displayed
      // TODO: Load and parse tileset file
      const mightyMikeLevel = {
        map: mapResult.value,
        tileset: null, // TODO: Load tileset
      };

      // Convert to a format that the editor can understand
      // This is a temporary conversion - need proper integration
      const ottoCompatible: ottoMaticLevel = {
        Hedr: {
          version: 1,
          numItems: mapResult.value.num_items,
          mapWidth: mapResult.value.map_width,
          mapHeight: mapResult.value.map_height,
          numTilePages: 1,
          numTiles: 100, // Placeholder
          tileSize: 32,
          minY: 0,
          maxY: 100,
          numSplines: 0,
          numFences: 0,
          numUniqueSupertiles: 1,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        // Convert 2D tile map to basic terrain structure
        Layr: mapResult.value.map_image.flat(),
        YCrd: new Array(
          mapResult.value.map_width * mapResult.value.map_height,
        ).fill(0),
        Itms: mapResult.value.items.map((item) => ({
          x: item.x,
          z: item.y, // Convert y to z for 3D compatibility
          type: item.type,
          p0: item.p0,
          p1: item.p1,
          p2: item.p2,
          p3: item.p3,
          flags: 0,
        })),
      };

      setData(splitLevelData(ottoCompatible));
      return ottoCompatible;
    } else {
      // Other games: use pyodide worker
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

      preprocessJson(jsonData, gameType);

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
            <SelectItem
              value="mightyMike"
              onClick={() => setGlobals(MightyMikeGlobals)}
            >
              Mighty Mike
            </SelectItem>
          </SelectContent>
        </Select>
        <p>
          Upload Level Data (
          {globals.DATA_TYPE === DataType.MIGHTY_MIKE ? ".map" : ".ter.rsrc"})
        </p>
        <FileUpload
          className="text-2xl"
          acceptType={
            globals.DATA_TYPE === DataType.MIGHTY_MIKE ? ".map" : ".ter.rsrc"
          }
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            setMapFile(file);
            parseLevelDataFile(file, globals);
          }}
        />
        {globals.DATA_TYPE !== DataType.MIGHTY_MIKE && (
          <>
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

                const mapImagesResult = await loadMapImages(dataView, globals);
                if (!mapImagesResult.ok) {
                  console.error(
                    "Failed to load map images:",
                    mapImagesResult.error.message,
                  );
                  return;
                }
                setMapImagesFile(mapImagesFile);
                setMapImages(mapImagesResult.value);
              }}
            />
          </>
        )}
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
            <MightyMikeLevels openFile={openFile} />
          </>
        )}
      </div>
    </div>
  );
}
