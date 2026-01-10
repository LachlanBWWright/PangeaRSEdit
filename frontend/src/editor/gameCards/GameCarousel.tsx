import React, { useCallback } from "react";
import {
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  NanosaurGlobals,
  Nanosaur2Globals,
  BillyFrontierGlobals,
  MightyMikeGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";
import { OttoLevels } from "@/editor/gameLevelSelectors/OttoLevels";
import { BugdomLevels } from "@/editor/gameLevelSelectors/BugdomLevels";
import { Bugdom2Levels } from "@/editor/gameLevelSelectors/Bugdom2Levels";
import { CroMagLevels } from "@/editor/gameLevelSelectors/CroMagLevels";
import { NanosaurLevels } from "@/editor/gameLevelSelectors/NanosaurLevels";
import { Nanosaur2Levels } from "@/editor/gameLevelSelectors/Nanosaur2Levels";
import { BillyFrontierLevels } from "@/editor/gameLevelSelectors/BillyFrontierLevels";
import { MightyMikeLevels } from "@/editor/gameLevelSelectors/MightyMikeLevels";
import { GameCard } from "./GameCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import type { Result } from "@/types/result";
import type { TunnelData } from "@/data/tunnelParser/types";

// Level component props type
interface LevelComponentProps {
  openFile: (url: string, gameType: GlobalsInterface) => void;
  onTunnelLoad?: (data: TunnelData, fileName: string) => void;
}

// Create stable wrapper components for each game type
const OttoLevelWrapper = ({ openFile }: LevelComponentProps) => <OttoLevels openFile={openFile} />;
const BugdomLevelWrapper = ({ openFile }: LevelComponentProps) => <BugdomLevels openFile={openFile} />;
const Bugdom2LevelWrapper = ({ openFile, onTunnelLoad }: LevelComponentProps) => (
  <Bugdom2Levels openFile={openFile} onTunnelLoad={onTunnelLoad} />
);
const CroMagLevelWrapper = ({ openFile }: LevelComponentProps) => <CroMagLevels openFile={openFile} />;
const NanosaurLevelWrapper = ({ openFile }: LevelComponentProps) => <NanosaurLevels openFile={openFile} />;
const Nanosaur2LevelWrapper = ({ openFile }: LevelComponentProps) => <Nanosaur2Levels openFile={openFile} />;
const BillyFrontierLevelWrapper = ({ openFile }: LevelComponentProps) => <BillyFrontierLevels openFile={openFile} />;
const MightyMikeLevelWrapper = ({ openFile }: LevelComponentProps) => <MightyMikeLevels openFile={openFile} />;

// Map game titles to their components at module level
const LEVEL_COMPONENTS_MAP: Record<string, React.ComponentType<LevelComponentProps>> = {
  "Otto Matic": OttoLevelWrapper,
  "Bugdom": BugdomLevelWrapper,
  "Bugdom 2": Bugdom2LevelWrapper,
  "Cro-Mag Rally": CroMagLevelWrapper,
  "Nanosaur": NanosaurLevelWrapper,
  "Nanosaur 2": Nanosaur2LevelWrapper,
  "Billy Frontier": BillyFrontierLevelWrapper,
  "Mighty Mike": MightyMikeLevelWrapper,
};

export function GameCarousel({
  showAllGames,
  handleOpenFile,
  handleParseLevelDataFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
  setTunnelData,
  setTunnelFileName,
}: {
  showAllGames: boolean;
  handleOpenFile: (url: string, gameType: GlobalsInterface) => void;
  handleParseLevelDataFile: (
    file: Blob,
    gameType: GlobalsInterface,
  ) => Promise<Result<unknown, Error>>;
  setMapFile: (f: File) => void;
  setMapImagesFile: (f: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
}) {
  const games: { title: string; globals: GlobalsInterface }[] = [
    {
      title: "Otto Matic",
      globals: OttoGlobals,
    },
  ];

  if (showAllGames) {
    games.push(
      { title: "Bugdom", globals: BugdomGlobals },
      { title: "Bugdom 2", globals: Bugdom2Globals },
      { title: "Cro-Mag Rally", globals: CroMagGlobals },
      { title: "Nanosaur", globals: NanosaurGlobals },
      { title: "Nanosaur 2", globals: Nanosaur2Globals },
      { title: "Billy Frontier", globals: BillyFrontierGlobals },
      { title: "Mighty Mike", globals: MightyMikeGlobals },
    );
  }

  // Use shadcn's Carousel/Embla implementation for robust multi-item behaviour

  return (
    <Carousel
      className="mx-auto w-full max-w-[1400px] h-[60vh] lg:h-[70vh] overflow-hidden px-12"
      opts={{ align: showAllGames ? "start" : "center", skipSnaps: true }}
    >
      <CarouselContent
        className={`${showAllGames ? "-ml-4" : ""} flex items-stretch h-full ${
          !showAllGames ? "justify-center" : ""
        }`}
      >
        {games.map((g) => (
          <GameCarouselItem
            key={g.title}
            game={g}
            handleOpenFile={handleOpenFile}
            handleParseLevelDataFile={handleParseLevelDataFile}
            setMapFile={setMapFile}
            setMapImagesFile={setMapImagesFile}
            setMapImages={setMapImages}
            setTunnelData={setTunnelData}
            setTunnelFileName={setTunnelFileName}
          />
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

function GameCarouselItem({
  game,
  handleOpenFile,
  handleParseLevelDataFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
  setTunnelData,
  setTunnelFileName,
}: {
  game: { title: string; globals: GlobalsInterface };
  handleOpenFile: (url: string, gameType: GlobalsInterface) => void;
  handleParseLevelDataFile: (
    file: Blob,
    gameType: GlobalsInterface,
  ) => Promise<Result<unknown, Error>>;
  setMapFile: (f: File) => void;
  setMapImagesFile: (f: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
}) {
  // Look up component from module-level map
  const LevelComponent = LEVEL_COMPONENTS_MAP[game.title];
  if (!LevelComponent) {
    throw new Error(`Unknown game title: ${game.title}`);
  }

  // Create tunnel load handler
  const handleTunnelLoad = useCallback((data: TunnelData, fileName: string) => {
    setTunnelFileName(fileName);
    setTunnelData(data);
  }, [setTunnelData, setTunnelFileName]);

  return (
    <CarouselItem className="pl-4 md:pl-6 md:basis-1/2 lg:basis-1/3 min-h-0 box-border overflow-hidden">
      <GameCard
        title={game.title}
        globals={game.globals}
        handleParseLevelDataFile={handleParseLevelDataFile}
        setMapFile={setMapFile}
        setMapImagesFile={setMapImagesFile}
        setMapImages={setMapImages}
        setTunnelData={setTunnelData}
        setTunnelFileName={setTunnelFileName}
      >
        <LevelComponent openFile={handleOpenFile} onTunnelLoad={handleTunnelLoad} />
      </GameCard>
    </CarouselItem>
  );
}
