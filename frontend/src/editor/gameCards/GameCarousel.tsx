import React from "react";
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

const getLevelComponent = (
  title: string,
): React.ComponentType<{
  openFile: (url: string, gameType: GlobalsInterface) => void;
}> => {
  switch (title) {
    case "Otto Matic":
      return OttoLevels;
    case "Bugdom":
      return BugdomLevels;
    case "Bugdom 2":
      return Bugdom2Levels;
    case "Cro-Mag Rally":
      return CroMagLevels;
    case "Nanosaur":
      return NanosaurLevels;
    case "Nanosaur 2":
      return Nanosaur2Levels;
    case "Billy Frontier":
      return BillyFrontierLevels;
    case "Mighty Mike":
      return MightyMikeLevels;
    default:
      throw new Error(`Unknown game title: ${title}`);
  }
};

export function GameCarousel({
  showAllGames,
  handleOpenFile,
  handleParseLevelDataFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
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
}) {
  const games: Array<{ title: string; globals: GlobalsInterface }> = [
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
      className="mx-auto w-full max-w-[1400px] h-[50vh] lg:h-[60vh] overflow-hidden px-12"
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
}) {
  const Level = getLevelComponent(game.title);

  return (
    <CarouselItem className="pl-4 md:pl-6 md:basis-1/2 lg:basis-1/3 min-h-0 box-border overflow-hidden">
      <GameCard
        title={game.title}
        globals={game.globals}
        handleParseLevelDataFile={handleParseLevelDataFile}
        setMapFile={setMapFile}
        setMapImagesFile={setMapImagesFile}
        setMapImages={setMapImages}
      >
        <Level openFile={handleOpenFile} />
      </GameCard>
    </CarouselItem>
  );
}
