import { useCallback } from "react";
import { type GlobalsInterface } from "@/data/globals/globals";
import { GameCard } from "./GameCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Result } from "neverthrow";
import type { TunnelData } from "@/data/tunnelParser/types";
import {
  getCarouselGames,
  LEVEL_COMPONENTS_MAP,
} from "@/editor/gameCards/gameCarouselConfig";
import type { ParsedLevelDataFile } from "@/editor/loadLogic/parseLevelDataFile";

export function GameCarousel({
  showAllGames,
  handleOpenFile,
  handleParseLevelDataFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
  setTunnelData,
  setTunnelFileName,
  onCreateBlankLevel,
}: {
  showAllGames: boolean;
  handleOpenFile: (url: string, gameType: GlobalsInterface) => void;
  handleParseLevelDataFile: (
    file: Blob,
    gameType: GlobalsInterface,
    companionTextureFile?: File,
  ) => Promise<Result<ParsedLevelDataFile, string>>;
  setMapFile: (f: File) => void;
  setMapImagesFile: (f: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
  onCreateBlankLevel: (gameType: GlobalsInterface) => void;
}) {
  const games = getCarouselGames(showAllGames);

  // Use shadcn's Carousel/Embla implementation for robust multi-item behaviour

  return (
    <Carousel
      className="mx-auto w-full h-full min-h-0 px-2 md:px-12"
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
            onCreateBlankLevel={onCreateBlankLevel}
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
  onCreateBlankLevel,
}: {
  game: { title: string; globals: GlobalsInterface };
  handleOpenFile: (url: string, gameType: GlobalsInterface) => void;
  handleParseLevelDataFile: (
    file: Blob,
    gameType: GlobalsInterface,
    companionTextureFile?: File,
  ) => Promise<Result<ParsedLevelDataFile, string>>;
  setMapFile: (f: File) => void;
  setMapImagesFile: (f: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
  onCreateBlankLevel: (gameType: GlobalsInterface) => void;
}) {
  // Look up component from module-level map
  const LevelComponent = LEVEL_COMPONENTS_MAP[game.title];

  // Create tunnel load handler
  const handleTunnelLoad = useCallback(
    (data: TunnelData, fileName: string) => {
      setTunnelFileName(fileName);
      setTunnelData(data);
    },
    [setTunnelData, setTunnelFileName],
  );

  if (!LevelComponent) {
    return (
      <CarouselItem className="pl-4 md:pl-6 md:basis-1/2 lg:basis-1/3 h-full min-h-0 box-border">
        <div className="p-4 border border-red-500 rounded bg-red-900/20">
          <p className="text-red-400">Unknown game title: {game.title}</p>
        </div>
      </CarouselItem>
    );
  }

  return (
    <CarouselItem className="pl-4 md:pl-6 md:basis-1/2 lg:basis-1/3 h-full min-h-0 box-border">
      <GameCard
        title={game.title}
        globals={game.globals}
        handleParseLevelDataFile={handleParseLevelDataFile}
        setMapFile={setMapFile}
        setMapImagesFile={setMapImagesFile}
        setMapImages={setMapImages}
        setTunnelData={setTunnelData}
        setTunnelFileName={setTunnelFileName}
        onCreateBlankLevel={onCreateBlankLevel}
      >
        <LevelComponent
          openFile={handleOpenFile}
          onTunnelLoad={handleTunnelLoad}
        />
      </GameCard>
    </CarouselItem>
  );
}
