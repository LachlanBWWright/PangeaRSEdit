import {
  Globals,
  type GlobalsInterface,
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  NanosaurGlobals,
  Nanosaur2Globals,
  BillyFrontierGlobals,
  MightyMikeGlobals,
} from "../data/globals/globals";
import { openFile } from "./loadLogic/openFile";
import { parseLevelDataFile } from "./loadLogic/parseLevelDataFile";

import { useAtom } from "jotai";
import { useState } from "react";
import { AtomicLevelData } from "../data/utils/levelDataUtils";
import { IntroText } from "./IntroText";
import { GameCarousel } from "./gameCards/GameCarousel";
import { Button } from "@/components/ui/button";
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
  onCreateBlankLevel,
  blankLevelError,
}: {
  mapFile: File | undefined;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setData: (data: AtomicLevelData) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
  onCreateBlankLevel: (gameType: GlobalsInterface) => void;
  blankLevelError: string | null;
}) {
  const [, setGlobals] = useAtom(Globals);
  const [selectedGame, setSelectedGame] = useState<GlobalsInterface>(OttoGlobals);

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

  const handleParseLevelDataFile = (file: Blob, gameType: GlobalsInterface) =>
    parseLevelDataFile(
      file,
      gameType,
      setData,
      undefined,
      setMapImages,
    );

  return (
    <div className="flex text-white m-auto flex-1 gap-8 flex-col items-stretch justify-start p-8 min-h-0">
      <div className="w-full flex flex-col gap-4 items-center">
        <div className="flex flex-col gap-2 items-center w-full lg:w-3/4">
          <IntroText />
        </div>

        <div className="flex flex-col gap-2 items-center w-full lg:w-3/4">
          <p className="text-sm text-gray-300">Create a blank level:</p>
          <select
            value={selectedGame.GAME_NAME}
            onChange={(e) => {
              const gameName = e.target.value;
              const options = [
                OttoGlobals,
                BugdomGlobals,
                Bugdom2Globals,
                CroMagGlobals,
                NanosaurGlobals,
                Nanosaur2Globals,
                BillyFrontierGlobals,
                MightyMikeGlobals,
              ];
              const match = options.find((option) => option.GAME_NAME === gameName);
              if (match) setSelectedGame(match);
            }}
            className="bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-blue-500 focus:outline-none max-w-full"
          >
            <option value={OttoGlobals.GAME_NAME}>Otto Matic</option>
            <option value={BugdomGlobals.GAME_NAME}>Bugdom</option>
            <option value={Bugdom2Globals.GAME_NAME}>Bugdom 2</option>
            <option value={CroMagGlobals.GAME_NAME}>Cro-Mag Rally</option>
            <option value={NanosaurGlobals.GAME_NAME}>Nanosaur</option>
            <option value={Nanosaur2Globals.GAME_NAME}>Nanosaur 2</option>
            <option value={BillyFrontierGlobals.GAME_NAME}>Billy Frontier</option>
            <option value={MightyMikeGlobals.GAME_NAME}>Mighty Mike</option>
          </select>
          <Button onClick={() => onCreateBlankLevel(selectedGame)}>
            Create Blank Level
          </Button>
          {blankLevelError && (
            <p className="text-sm text-red-400">{blankLevelError}</p>
          )}
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
