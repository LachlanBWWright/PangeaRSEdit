import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Game } from "@/data/globals/globals";
import { GAME_DISPLAY_NAMES } from "@/editor/utils/gamePreviewRuntime";
import { GAME_PORT_CONFIGS } from "@/editor/utils/gamePortConfig";

interface GameLaunchCardProps {
  game: Game;
  onPlayNormally: (game: Game) => void;
}

export function GameLaunchCard({ game, onPlayNormally }: GameLaunchCardProps) {
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
