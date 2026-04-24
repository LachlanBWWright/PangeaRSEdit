import { useState } from "react";
import { Download, Gamepad2 } from "lucide-react";
import { getGamesByCategory, ALL_GAME_CONFIGS } from "@/data/levels";
import { TestGameDialog } from "@/editor/TestGameDialog";
import { GAME_PORT_CONFIGS } from "@/editor/utils/gamePortConfig";
import type { Game } from "@/data/globals/globals";
import { GameLaunchCard } from "@/pages/DownloadLevels/GameLaunchCard";
import { GameSection } from "@/pages/DownloadLevels/GameSection";

export function DownloadLevels() {
  const gamesByCategory = getGamesByCategory();

  const [dialogGame, setDialogGame] = useState<Game | null>(null);
  const [dialogLevel, setDialogLevel] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogNormalLaunch, setDialogNormalLaunch] = useState(false);
  const [dialogTerrainDataBytes, setDialogTerrainDataBytes] =
    useState<Uint8Array | null>(null);
  const [dialogTerrainRsrcBytes, setDialogTerrainRsrcBytes] =
    useState<Uint8Array | null>(null);

  /** Open the dialog for playing a custom level (with terrain injection). */
  const handlePlayInBrowser = (
    game: Game,
    levelNumber: number,
    dataBytes: Uint8Array | null,
    rsrcBytes: Uint8Array | null,
  ) => {
    setDialogGame(game);
    setDialogLevel(levelNumber);
    setDialogNormalLaunch(false);
    setDialogTerrainDataBytes(dataBytes);
    setDialogTerrainRsrcBytes(rsrcBytes);
    setDialogOpen(true);
  };

  /** Open the dialog to play a game from its title screen (no terrain injection). */
  const handlePlayNormally = (game: Game) => {
    const config = GAME_PORT_CONFIGS[game];
    setDialogGame(game);
    setDialogLevel(config.defaultLevel);
    setDialogNormalLaunch(true);
    setDialogTerrainDataBytes(null);
    setDialogTerrainRsrcBytes(null);
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

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Gamepad2 className="w-7 h-7 text-green-400" />
            <h2 className="text-3xl font-bold text-white">Play Games</h2>
            <div className="h-px bg-gray-600 flex-1"></div>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Launch any of the 8 Pangea ports directly in your browser from the
            title screen.
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
              Download fan-made levels and replace the originals in your local
              game installation.
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

      {dialogGame !== null && (
        <TestGameDialog
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
          gameType={dialogGame}
          levelNumber={dialogLevel}
          onLevelNumberChange={setDialogLevel}
          terrainDataBytes={dialogTerrainDataBytes}
          terrainRsrcBytes={dialogTerrainRsrcBytes}
          terrainTextureBytes={null}
          normalLaunch={dialogNormalLaunch}
        />
      )}
    </div>
  );
}
