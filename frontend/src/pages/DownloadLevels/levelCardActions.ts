import { toast } from "sonner";
import { GAME_KEY_TO_ENUM, type Level } from "@/data/levels";
import type { Game } from "@/data/globals/globals";
import {
  downloadLevelArchive,
  fetchPlayBytes,
  triggerBrowserDownload,
} from "@/pages/DownloadLevels/downloadLevelUtils";

export interface PlayInBrowserHandlerArgs {
  readonly level: Level;
  readonly onPlayInBrowser: (
    game: Game,
    levelNumber: number,
    dataBytes: Uint8Array | null,
    rsrcBytes: Uint8Array | null,
  ) => void;
  readonly setIsFetchingPlay: (value: boolean) => void;
}

export function difficultyClass(difficulty: Level["difficulty"]): string {
  if (difficulty === "Easy") {
    return "bg-green-900 text-green-300";
  }

  if (difficulty === "Medium") {
    return "bg-yellow-900 text-yellow-300";
  }

  return "bg-red-900 text-red-300";
}

export function isPlayableLevel(level: Level): boolean {
  return (
    GAME_KEY_TO_ENUM[level.game] !== undefined &&
    level.previewLevelNumber !== undefined
  );
}

export function createDownloadHandler(level: Level): () => void {
  return () => {
    void downloadLevelArchive(level).match(
      ({ data, zipName }) => {
        triggerBrowserDownload(data, zipName);
        toast.success(`Downloaded ${zipName}`);
      },
      (error) => toast.error(`Download failed: ${error.message}`),
    );
  };
}

export function createPlayInBrowserHandler({
  level,
  onPlayInBrowser,
  setIsFetchingPlay,
}: PlayInBrowserHandlerArgs): () => void {
  return () => {
    const gameEnum = GAME_KEY_TO_ENUM[level.game];
    if (gameEnum === undefined || level.previewLevelNumber === undefined) {
      return;
    }

    const levelNumber = level.previewLevelNumber;
    setIsFetchingPlay(true);
    void fetchPlayBytes(level.terFile, level.rsrcFile)
      .match(
        ([dataBytes, rsrcBytes]) => {
          onPlayInBrowser(gameEnum, levelNumber, dataBytes, rsrcBytes);
        },
        (error) => {
          toast.error(`Failed to load level for playback: ${error.message}`);
        },
      )
      .finally(() => {
        setIsFetchingPlay(false);
      });
  };
}
