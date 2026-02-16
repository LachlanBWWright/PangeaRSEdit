import { Globals, type GlobalsInterface } from "../data/globals/globals";
import { openFile } from "./loadLogic/openFile";
import { parseLevelDataFile } from "./loadLogic/parseLevelDataFile";

import { useAtom } from "jotai";
import { AtomicLevelData } from "../data/utils/levelDataUtils";
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
  onCreateBlankLevel,
}: {
  mapFile: File | undefined;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setData: (data: AtomicLevelData) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
  onCreateBlankLevel: (gameType: GlobalsInterface) => void;
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

  const handleParseLevelDataFile = (file: Blob, gameType: GlobalsInterface) =>
    parseLevelDataFile(
      file,
      gameType,
      setData,
      undefined,
      setMapImages,
    );

  return (
    <div className="flex text-white flex-col items-stretch justify-start p-4 md:p-8 pb-8 h-[calc(100vh-56px)] overflow-auto">
      <div className="w-full flex flex-col gap-4 items-center min-h-full">
        <div className="flex-none flex flex-col gap-2 items-center w-full lg:w-3/4">
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
            onCreateBlankLevel={onCreateBlankLevel}
          />
        </div>
      </div>
    </div>
  );
}
