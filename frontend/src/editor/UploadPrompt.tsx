import { FileUpload } from "../components/FileUpload";
// image decompression moved to `loadLogic/loadMapImages`
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  DataType,
  // Game,
  Globals,
  MightyMikeGlobals,
  Nanosaur2Globals,
  OttoGlobals,
  type GlobalsInterface,
} from "../data/globals/globals";
import { loadMapImages } from "./loadLogic/loadMapImages";
import { openFile } from "./loadLogic/openFile";
import { parseLevelDataFile } from "./loadLogic/parseLevelDataFile";

import { useAtom } from "jotai";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { AtomicLevelData } from "../data/utils/levelDataUtils";
import { IntroText } from "./IntroText";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
// Utility functions are used by the extracted logic modules.
// Level grids moved to `gameLevelSelectors/*`
import { OttoLevels } from "./gameLevelSelectors/OttoLevels";
import { BugdomLevels } from "./gameLevelSelectors/BugdomLevels";
import { Bugdom2Levels } from "./gameLevelSelectors/Bugdom2Levels";
import { CroMagLevels } from "./gameLevelSelectors/CroMagLevels";
import { NanosaurLevels } from "./gameLevelSelectors/NanosaurLevels";
import { Nanosaur2Levels } from "./gameLevelSelectors/Nanosaur2Levels";
import { BillyFrontierLevels } from "./gameLevelSelectors/BillyFrontierLevels";
import { MightyMikeLevels } from "./gameLevelSelectors/MightyMikeLevels";
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

  const handleOpenFile = (url: string, gameType: GlobalsInterface) =>
    openFile({
      url,
      gameType,
      setGlobals,
      setMapFile,
      setMapImagesFile,
      setMapImages,
      pyodideWorker,
      setData,
    });

  const handleParseLevelDataFile = (file: Blob, gameType: GlobalsInterface) =>
    parseLevelDataFile(file, gameType, pyodideWorker, setData);

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
          <SelectTrigger className="min-w-fit" data-testid="game-selector">
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
            const parseResult = await handleParseLevelDataFile(file, globals);
            if (!parseResult.ok) {
              console.error(
                "Failed to parse level data:",
                parseResult.error?.message ?? parseResult.error,
              );
              toast.error("Failed to parse level data", {
                description:
                  parseResult.error instanceof Error
                    ? parseResult.error.message
                    : String(parseResult.error),
              });
              return;
            }
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
        <OttoLevels openFile={handleOpenFile} />
        {showAllGames && (
          <>
            <BugdomLevels openFile={handleOpenFile} />
            <Bugdom2Levels openFile={handleOpenFile} />
            <CroMagLevels openFile={handleOpenFile} />
            <NanosaurLevels openFile={handleOpenFile} />
            <Nanosaur2Levels openFile={handleOpenFile} />
            <BillyFrontierLevels openFile={handleOpenFile} />
            <MightyMikeLevels openFile={handleOpenFile} />
          </>
        )}
      </div>
    </div>
  );
}
