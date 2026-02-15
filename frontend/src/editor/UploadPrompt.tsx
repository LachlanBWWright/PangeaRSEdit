import { useState } from "react";
import { DataType, Globals, type GlobalsInterface } from "../data/globals/globals";
import { openFile } from "./loadLogic/openFile";
import { parseLevelDataFile } from "./loadLogic/parseLevelDataFile";
import { loadMapImages } from "./loadLogic/loadMapImages";
import { downloadFileFromGoogleDrive } from "@/utils/googleDrive";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  NanosaurGlobals,
  Nanosaur2Globals,
  BillyFrontierGlobals,
  MightyMikeGlobals,
} from "@/data/globals/globals";

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
  const [driveToken, setDriveToken] = useState("");
  const [driveLevelFileId, setDriveLevelFileId] = useState("");
  const [driveTextureFileId, setDriveTextureFileId] = useState("");
  const [selectedDriveGame, setSelectedDriveGame] = useState("otto");

  const driveGameOptions = [
    { id: "otto", name: "Otto Matic", globals: OttoGlobals },
    { id: "bugdom", name: "Bugdom", globals: BugdomGlobals },
    { id: "bugdom2", name: "Bugdom 2", globals: Bugdom2Globals },
    { id: "cromag", name: "Cro-Mag Rally", globals: CroMagGlobals },
    { id: "nanosaur", name: "Nanosaur", globals: NanosaurGlobals },
    { id: "nanosaur2", name: "Nanosaur 2", globals: Nanosaur2Globals },
    { id: "billy", name: "Billy Frontier", globals: BillyFrontierGlobals },
    { id: "mike", name: "Mighty Mike", globals: MightyMikeGlobals },
  ];

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

  const handleLoadFromGoogleDrive = async () => {
    if (!driveToken || !driveLevelFileId) {
      toast.error("Google Drive token and level file id are required");
      return;
    }

    const selectedGame = driveGameOptions.find((game) => game.id === selectedDriveGame);
    if (!selectedGame) {
      toast.error("Select a game before loading from Google Drive");
      return;
    }

    setGlobals(selectedGame.globals);
    toast.loading("Loading level from Google Drive...");

    const levelResult = await downloadFileFromGoogleDrive(driveLevelFileId, driveToken);
    if ("error" in levelResult) {
      toast.error(levelResult.error);
      return;
    }

    const levelFile = new File([levelResult.blob], levelResult.filename);
    setMapFile(levelFile);

    await handleParseLevelDataFile(levelFile, selectedGame.globals);

    if (driveTextureFileId) {
      const textureResult = await downloadFileFromGoogleDrive(
        driveTextureFileId,
        driveToken,
      );
      if ("error" in textureResult) {
        toast.error(textureResult.error);
        return;
      }

      const textureFile = new File([textureResult.blob], textureResult.filename);
      setMapImagesFile(textureFile);

      if (selectedGame.globals.DATA_TYPE !== DataType.RSRC_FORK) {
        const textureBuffer = await textureResult.blob.arrayBuffer();
        const imagesResult = await loadMapImages(
          new DataView(textureBuffer),
          selectedGame.globals,
        );
        if (imagesResult.isErr()) {
          toast.error(imagesResult.error.message);
          return;
        }
        setMapImages(imagesResult.value);
      }
    }

    toast.success("Loaded level from Google Drive");
  };

  return (
    <div className="flex text-white flex-col items-stretch justify-start p-8 h-full overflow-hidden">
      <div className="w-full flex flex-col gap-4 items-center flex-1 min-h-0">
        <div className="flex-none flex flex-col gap-2 items-center w-full lg:w-3/4">
          <IntroText />
        </div>

        <div className="w-full flex-1 min-h-0">
          <div className="mb-4 p-3 border border-gray-700 rounded-md bg-gray-900/60 flex flex-col gap-2">
            <p className="font-semibold">Load from Google Drive</p>
            <Input
              type="password"
              placeholder="OAuth access token"
              value={driveToken}
              onChange={(event) => setDriveToken(event.target.value)}
            />
            <div className="grid md:grid-cols-3 gap-2">
              <Select
                value={selectedDriveGame}
                onValueChange={setSelectedDriveGame}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Game" />
                </SelectTrigger>
                <SelectContent>
                  {driveGameOptions.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Level file id"
                value={driveLevelFileId}
                onChange={(event) => setDriveLevelFileId(event.target.value)}
              />
              <Input
                placeholder="Texture file id (optional)"
                value={driveTextureFileId}
                onChange={(event) => setDriveTextureFileId(event.target.value)}
              />
            </div>
            <Button onClick={handleLoadFromGoogleDrive}>
              Load from Google Drive
            </Button>
          </div>
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
