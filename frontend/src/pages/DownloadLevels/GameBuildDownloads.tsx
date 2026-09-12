import { Button } from "@/components/ui/button";
import { getGameDownloadConfig, getGameDownloadUrl } from "./gameDownloadVariants";
import type { Game } from "@/data/globals/globals";

interface GameBuildDownloadsProps {
  game: Game;
}

export function GameBuildDownloads({ game }: GameBuildDownloadsProps) {
  const config = getGameDownloadConfig(game);

  if (config === undefined) {
    return null;
  }

  return (
    <div
      className="grid grid-cols-2 gap-2"
      aria-label={`${config.portName} downloads`}
    >
      {config.variants.map((variant) => (
        <Button
          key={variant.id}
          asChild
          size="sm"
          variant="outline"
          className={`w-full justify-start text-gray-100 hover:text-white ${variant.className}`}
        >
          <a
            href={getGameDownloadUrl(config.portName, variant.fileName)}
            aria-label={`Download ${config.portName} for ${variant.label}`}
          >
            <variant.icon className="h-4 w-4" aria-hidden="true" />
            {variant.label}
          </a>
        </Button>
      ))}
    </div>
  );
}
