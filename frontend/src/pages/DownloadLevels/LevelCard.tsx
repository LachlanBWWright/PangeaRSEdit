import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Loader2, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Level } from "@/data/levels";
import type { Game } from "@/data/globals/globals";
import {
  createDownloadHandler,
  createPlayInBrowserHandler,
  difficultyClass,
  isPlayableLevel,
} from "@/pages/DownloadLevels/levelCardActions";

interface LevelCardProps {
  level: Level;
  onPlayInBrowser: (
    game: Game,
    levelNumber: number,
    dataBytes: Uint8Array | null,
    rsrcBytes: Uint8Array | null,
  ) => void;
}

export function LevelCard({ level, onPlayInBrowser }: LevelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFetchingPlay, setIsFetchingPlay] = useState(false);
  const canPlay = isPlayableLevel(level);

  const handleDownload = createDownloadHandler(level);
  const handlePlayInBrowser = createPlayInBrowserHandler({
    level,
    onPlayInBrowser,
    setIsFetchingPlay,
  });

  return (
    <Card className="overflow-hidden border-gray-700 bg-gray-800 transition-colors hover:border-gray-600">
      {level.previewImage && (
        <img
          src={level.previewImage.src}
          alt={level.previewImage.alt}
          loading="lazy"
          className="aspect-[3/2] w-full border-b border-gray-700 object-cover"
        />
      )}
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
          {canPlay ? (
            <Button
              onClick={handlePlayInBrowser}
              disabled={isFetchingPlay}
              className="flex w-full items-center gap-2"
            >
              {isFetchingPlay ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isFetchingPlay ? "Loading level…" : "Play in browser"}
            </Button>
          ) : null}
          <Button onClick={handleDownload} variant={canPlay ? "outline" : "default"}>
            <Download className="size-4" />
            Download level
          </Button>
          <p className="text-xs text-gray-300">
            To install, replace the corresponding level file in <code>Data/Terrain</code>.
          </p>
        </div>
        <Button
          variant="ghost"
          aria-expanded={isExpanded}
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
