import { useState } from "react";
import { Download, ChevronDown, ChevronUp, Gamepad2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getGamesByCategory,
  GAME_KEY_TO_ENUM,
  ALL_GAME_CONFIGS,
  type Level,
} from "@/data/levels";
import { toast } from "sonner";
import { zip } from "fflate";
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";
import { TestGameDialog } from "@/editor/TestGameDialog";
import type { Game } from "@/data/globals/globals";
import { GAME_DISPLAY_NAMES } from "@/editor/utils/gamePreviewRuntime";
import { GAME_PORT_CONFIGS } from "@/editor/utils/gamePortConfig";

/** Fetch a URL as a Uint8Array using ResultAsync. */
function fetchBytes(url: string): ResultAsync<Uint8Array<ArrayBuffer>, Error> {
  return ResultAsync.fromPromise(
    fetch(url)
      .then((resp) => {
        if (!resp.ok)
          return Promise.reject(new Error(`HTTP ${resp.status}: ${url}`));
        return resp.arrayBuffer();
      })
      .then((buf) => new Uint8Array(buf)),
    mapErr,
  );
}

/** Zip files using fflate, returning a ResultAsync. */
function zipFiles(
  files: Record<string, Uint8Array<ArrayBuffer>>,
): ResultAsync<Uint8Array<ArrayBuffer>, Error> {
  return ResultAsync.fromPromise(
    new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
      zip(files, (e, data) => {
        if (e) reject(e);
        else resolve(data.slice(0));
      });
    }),
    mapErr,
  );
}

/** Build a timestamp string suitable for filenames: YYYYMMDD_HHMMSS */
function fileTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

interface LevelCardProps {
  level: Level;
  onPlayInBrowser: (game: Game, levelNumber: number) => void;
}

function LevelCard({ level, onPlayInBrowser }: LevelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const downloadLevel = () => {
    const fetchPairs: { name: string; url: string }[] = [];
    if (level.terFile)
      fetchPairs.push({
        name: level.terFile.split("/").pop() ?? `${level.id}.ter`,
        url: level.terFile,
      });
    if (level.rsrcFile)
      fetchPairs.push({
        name: level.rsrcFile.split("/").pop() ?? `${level.id}.ter.rsrc`,
        url: level.rsrcFile,
      });

    if (fetchPairs.length === 0) {
      toast.error("No downloadable files found for this level");
      return;
    }

    const levelNumber = level.category?.replace(/\D/g, "") ?? level.id;
    const zipName =
      `${level.gameDisplayName} Level ${levelNumber} (${fileTimestamp()}).zip`.replace(
        /[/\\:*?"<>|]/g,
        "_",
      );

    const fetchAll = ResultAsync.combine(
      fetchPairs.map(({ name, url }) =>
        fetchBytes(url).map((data) => ({ name, data })),
      ),
    );

    void fetchAll
      .andThen((pairs) => {
        const files: Record<string, Uint8Array<ArrayBuffer>> = {};
        for (const { name, data } of pairs) files[name] = data;
        return zipFiles(files);
      })
      .match(
        (data) => {
          const blob = new Blob([data], { type: "application/zip" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = zipName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(`Downloaded ${zipName}`);
        },
        (e) => toast.error(`Download failed: ${e.message}`),
      );
  };

  const gameEnum = GAME_KEY_TO_ENUM[level.game];
  const canPlay =
    gameEnum !== undefined && level.previewLevelNumber !== undefined;

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-white text-lg mb-1">
              {level.name}
            </CardTitle>
            <CardDescription className="text-gray-300 mb-2">
              {level.gameDisplayName}
              {level.category && (
                <span className="ml-2 text-blue-400">• {level.category}</span>
              )}
              {level.difficulty && (
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    level.difficulty === "Easy"
                      ? "bg-green-900 text-green-300"
                      : level.difficulty === "Medium"
                        ? "bg-yellow-900 text-yellow-300"
                        : "bg-red-900 text-red-300"
                  }`}
                >
                  {level.difficulty}
                </span>
              )}
            </CardDescription>
            <p className="text-gray-400 text-sm">{level.summary}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2 mb-2">
          <Button
            onClick={() => void downloadLevel()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          {canPlay && (
            <Button
              onClick={() =>
                onPlayInBrowser(gameEnum, level.previewLevelNumber ?? 0)
              }
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Play Level in Browser
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between text-gray-300 hover:text-white hover:bg-gray-700 p-3"
        >
          <span>Details</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
        {isExpanded && (
          <div className="text-gray-300 text-sm leading-relaxed bg-gray-900 rounded-lg p-4">
            {level.description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface GameSectionProps {
  gameName: string;
  levels: Level[];
  onPlayInBrowser: (game: Game, levelNumber: number) => void;
}

function GameSection({ gameName, levels, onPlayInBrowser }: GameSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4 pl-1">
        <h3 className="text-lg font-semibold text-gray-200">{gameName}</h3>
        <div className="h-px bg-gray-700 flex-1"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels.map((level) => (
          <LevelCard
            key={level.id}
            level={level}
            onPlayInBrowser={onPlayInBrowser}
          />
        ))}
      </div>
    </div>
  );
}

/** Card for launching any game directly in the browser (from title screen). */
function GameLaunchCard({
  game,
  onPlayNormally,
}: {
  game: Game;
  onPlayNormally: (game: Game) => void;
}) {
  const config = GAME_PORT_CONFIGS[game];
  const displayName = GAME_DISPLAY_NAMES[game];

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base">{displayName}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          onClick={() => onPlayNormally(game)}
          className="flex w-full items-center gap-1 bg-green-700 hover:bg-green-600 text-white"
          disabled={!config.wasmAvailable}
        >
          <Play className="w-4 h-4" />
          Play in Browser
        </Button>
      </CardContent>
    </Card>
  );
}

export function DownloadLevels() {
  const gamesByCategory = getGamesByCategory();

  const [dialogGame, setDialogGame] = useState<Game | null>(null);
  const [dialogLevel, setDialogLevel] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogNormalLaunch, setDialogNormalLaunch] = useState(false);

  /** Open the dialog for playing a custom level (with terrain injection). */
  const handlePlayInBrowser = (game: Game, levelNumber: number) => {
    setDialogGame(game);
    setDialogLevel(levelNumber);
    setDialogNormalLaunch(false);
    setDialogOpen(true);
  };

  /** Open the dialog to play a game from its title screen (no terrain injection). */
  const handlePlayNormally = (game: Game) => {
    const config = GAME_PORT_CONFIGS[game];
    setDialogGame(game);
    setDialogLevel(config.defaultLevel);
    setDialogNormalLaunch(true);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setDialogGame(null);
  };

  return (
    <div className="h-full overflow-auto bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-2 mb-8 text-center">
          <h1 className="text-4xl font-bold text-white pb-2">Custom Levels</h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Play and download custom levels for various Pangea Software games.
            Downloaded files go in the{" "}
            <code className="bg-gray-700 px-1 rounded">Data/Terrain</code>{" "}
            folder inside the game files to replace the corresponding level.
          </p>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            To submit a level, open a{" "}
            <a
              href="https://github.com/LachlanBWWright/PangeaRSEdit/discussions"
              className="text-blue-400 underline hover:text-blue-300"
            >
              GitHub discussion
            </a>{" "}
            or message u/LachlanBWWright on Reddit.
          </p>
        </div>

        {/* Game Launcher Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Gamepad2 className="w-7 h-7 text-green-400" />
            <h2 className="text-3xl font-bold text-white">Play Games</h2>
            <div className="h-px bg-gray-600 flex-1"></div>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Launch any of the 8 Pangea ports directly in your browser from the title screen.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ALL_GAME_CONFIGS.map((config) => (
              <GameLaunchCard
                key={config.game}
                game={config.game}
                onPlayNormally={handlePlayNormally}
              />
            ))}
          </div>
        </div>

        {/* Custom Levels Section */}
        {gamesByCategory.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Download className="w-7 h-7 text-blue-400" />
              <h2 className="text-3xl font-bold text-white">
                Download Custom Levels
              </h2>
              <div className="h-px bg-gray-600 flex-1"></div>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Download fan-made levels and replace the originals in your local game installation.
            </p>
            {gamesByCategory.map((game) => (
              <GameSection
                key={game.id}
                gameName={game.name}
                levels={game.levels}
                onPlayInBrowser={handlePlayInBrowser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared play-in-browser dialog */}
      {dialogGame !== null && (
        <TestGameDialog
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
          gameType={dialogGame}
          levelNumber={dialogLevel}
          onLevelNumberChange={setDialogLevel}
          terrainDataBytes={null}
          terrainRsrcBytes={null}
          terrainTextureBytes={null}
          normalLaunch={dialogNormalLaunch}
        />
      )}
    </div>
  );
}
