import { Globals, type GlobalsInterface } from "../data/globals/globals";
import { openFile } from "./loadLogic/openFile";
import { parseLevelDataFile } from "./loadLogic/parseLevelDataFile";

import { useAtom } from "jotai";
import { AtomicLevelData } from "../data/utils/levelDataUtils";
import { IntroText } from "./IntroText";
import { GameCarousel } from "./gameCards/GameCarousel";
/* import { Separator } from "@/components/ui/separator";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker"; //"../utils/bg3dGltfWorker.ts?worker"; */

export function UploadPrompt({
  setMapFile,
  setMapImagesFile,
  setMapImages,
  setData,
}: {
  mapFile: File | undefined;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setData: (data: AtomicLevelData) => void;
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
          />
        </div>
      </div>
    </div>
  );
}
