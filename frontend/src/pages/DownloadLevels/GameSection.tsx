import type { Level } from "@/data/levels";
import type { Game } from "@/data/globals/globals";
import { LevelCard } from "@/pages/DownloadLevels/LevelCard";

interface GameSectionProps {
  gameName: string;
  levels: Level[];
  onPlayInBrowser: (
    game: Game,
    levelNumber: number,
    dataBytes: Uint8Array | null,
    rsrcBytes: Uint8Array | null,
  ) => void;
}

export function GameSection({
  gameName,
  levels,
  onPlayInBrowser,
}: GameSectionProps) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-3 pl-1">
        <h3 className="text-lg font-semibold text-gray-200">{gameName}</h3>
        <div className="h-px flex-1 bg-gray-700" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
