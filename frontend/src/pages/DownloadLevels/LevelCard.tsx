import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Loader2, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GAME_KEY_TO_ENUM, type Level } from "@/data/levels";
import type { Game } from "@/data/globals/globals";
import { toast } from "sonner";
import {
  downloadLevelArchive,
  fetchPlayBytes,
  triggerBrowserDownload,
} from "@/pages/DownloadLevels/downloadLevelUtils";

interface LevelCardProps {
  level: Level;
  onPlayInBrowser: (
    game: Game,
    levelNumber: number,
    dataBytes: Uint8Array | null,
    rsrcBytes: Uint8Array | null,
  ) => void;
}

function difficultyClass(difficulty: Level["difficulty"]): string {
  if (difficulty === "Easy") {
    return "bg-green-900 text-green-300";
  }

  if (difficulty === "Medium") {
    return "bg-yellow-900 text-yellow-300";
  }

  return "bg-red-900 text-red-300";
}

export function LevelCard({ level, onPlayInBrowser }: LevelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFetchingPlay, setIsFetchingPlay] = useState(false);
  const gameEnum = GAME_KEY_TO_ENUM[level.game];
  const canPlay =
    gameEnum !== undefined && level.previewLevelNumber !== undefined;

  const playLevelNumber = useMemo(
    () => level.previewLevelNumber ?? 0,
    [level.previewLevelNumber],
  );

  const handleDownload = () => {
    void downloadLevelArchive(level).match(
      ({ data, zipName }) => {
        triggerBrowserDownload(data, zipName);
        toast.success(`Downloaded ${zipName}`);
      },
      (error) => toast.error(`Download failed: ${error.message}`),
    );
  };

  const handlePlayInBrowser = () => {
    if (!canPlay || gameEnum === undefined) {
      return;
    }

    setIsFetchingPlay(true);
    void fetchPlayBytes(level.terFile, level.rsrcFile)
      .match(
        ([dataBytes, rsrcBytes]) => {
          onPlayInBrowser(gameEnum, playLevelNumber, dataBytes, rsrcBytes);
        },
        (error) => {
          toast.error(`Failed to load level for playback: ${error.message}`);
        },
      )
      .finally(() => {
        setIsFetchingPlay(false);
      });
  };

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="mb-1 text-lg text-white">
              {level.name}
            </CardTitle>
            <CardDescription className="mb-2 text-gray-300">
              {level.gameDisplayName}
              {level.category ? (
                <span className="ml-2 text-blue-400">• {level.category}</span>
              ) : null}
              {level.difficulty ? (
                <span
                  className={`ml-2 rounded px-2 py-1 text-xs font-medium ${difficultyClass(level.difficulty)}`}
                >
                  {level.difficulty}
                </span>
              ) : null}
            </CardDescription>
            <p className="text-sm text-gray-400">{level.summary}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-2 flex flex-col gap-2">
          <Button
            onClick={handleDownload}
            className="flex w-full items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          {canPlay ? (
            <Button
              onClick={handlePlayInBrowser}
              disabled={isFetchingPlay}
              variant="outline"
              className="flex w-full items-center gap-2"
            >
              {isFetchingPlay ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isFetchingPlay ? "Loading..." : "Play Level in Browser"}
            </Button>
          ) : null}
        </div>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded((value) => !value)}
          className="w-full justify-between p-3 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <span>Details</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        {isExpanded ? (
          <div className="rounded-lg bg-gray-900 p-4 text-sm leading-relaxed text-gray-300">
            {level.description}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
