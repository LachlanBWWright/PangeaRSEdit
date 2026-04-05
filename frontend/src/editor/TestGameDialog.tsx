import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Game } from "../data/globals/globals";
import {
  buildPangeaPortsUrl,
  GAME_PORT_CONFIGS,
  getLevelIndex,
  type AnyLevelInfo,
} from "./utils/gamePortConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: Game;
  levelNumber: number;
  onLevelNumberChange: (n: number) => void;
  terrainRsrcBlob: Blob | null;
  terrainDataBlob: Blob | null;
}

const REMOTE_PANGEA_PORTS_BASE_URL = "https://lachlanbwwright.github.io/Pangea-Ports/";

const GAME_DISPLAY_NAMES: Readonly<Record<Game, string>> = {
  [Game.OTTO_MATIC]: "Otto Matic",
  [Game.NANOSAUR]: "Nanosaur",
  [Game.BUGDOM]: "Bugdom",
  [Game.BUGDOM_2]: "Bugdom 2",
  [Game.CRO_MAG]: "Cro-Mag Rally",
  [Game.BILLY_FRONTIER]: "Billy Frontier",
  [Game.MIGHTY_MIKE]: "Mighty Mike",
  [Game.NANOSAUR_2]: "Nanosaur 2",
};

function levelLabel(info: AnyLevelInfo, idx: number): string {
  if ("trackNumber" in info) {
    return `Track ${String(info.trackNumber)}: ${info.name}`;
  }
  if ("areaNumber" in info) {
    return `Area ${String(info.areaNumber + 1)}: ${info.name}`;
  }
  return `Lv ${String(idx + 1)}: ${info.name}`;
}

function buildLocalPangeaPortsBaseUrl(): string {
  return new URL("games/pangea-ports/", window.location.href).href;
}

export function TestGameDialog(props: Props) {
  const {
    open,
    onOpenChange,
    gameType,
    levelNumber,
    onLevelNumberChange,
  } = props;
  const config = GAME_PORT_CONFIGS[gameType];
  const [localPangeaPortsAvailable, setLocalPangeaPortsAvailable] = useState<boolean | null>(
    null,
  );
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const currentLevelInfo =
    config.levels.find((level) => getLevelIndex(level) === levelNumber) ??
    config.levels[0];
  const levelLabelText = currentLevelInfo
    ? levelLabel(currentLevelInfo, config.levels.indexOf(currentLevelInfo))
    : "";

  useEffect(() => {
    const localBaseUrl = buildLocalPangeaPortsBaseUrl();
    // Probe the game's main JS file (not the HTML). Vite's SPA fallback serves
    // text/html for any unknown path; the real game JS file returns
    // application/javascript, so content-type distinguishes the two cases.
    const siteLaunchDir = config.siteLaunchPath.substring(
      0,
      config.siteLaunchPath.lastIndexOf("/") + 1,
    );
    const probeUrl = new URL(`${siteLaunchDir}${config.mainJs}`, localBaseUrl).href;
    let cancelled = false;

    fetch(probeUrl, { method: "HEAD" })
      .then((response) => {
        if (!cancelled) {
          const contentType = response.headers.get("content-type") ?? "";
          setLocalPangeaPortsAvailable(
            response.ok && !contentType.includes("text/html"),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocalPangeaPortsAvailable(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config]);

  const buildLaunchUrl = useCallback((selectedLevel: number) => {
    const localBaseUrl = buildLocalPangeaPortsBaseUrl();
    const baseUrl = localPangeaPortsAvailable ? localBaseUrl : REMOTE_PANGEA_PORTS_BASE_URL;
    return buildPangeaPortsUrl(baseUrl, config, selectedLevel);
  }, [config, localPangeaPortsAvailable]);

  const sourceLabel = useMemo(() => {
    if (localPangeaPortsAvailable === null) {
      return "Checking for the bundled Pangea Ports launcher…";
    }
    return localPangeaPortsAvailable
      ? "Using the bundled Pangea Ports launcher."
      : "Using the hosted Pangea Ports launcher.";
  }, [localPangeaPortsAvailable]);

  const handleStartPreview = useCallback(() => {
    setActivePreviewUrl(buildLaunchUrl(levelNumber));
    setPreviewKey((currentKey) => currentKey + 1);
  }, [buildLaunchUrl, levelNumber]);

  const handleOpenInNewTab = useCallback(() => {
    window.open(buildLaunchUrl(levelNumber), "_blank", "noopener,noreferrer");
  }, [buildLaunchUrl, levelNumber]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {`Preview in ${GAME_DISPLAY_NAMES[config.game]}`}
            {levelLabelText ? ` — ${levelLabelText}` : ""}
          </DialogTitle>
          <DialogDescription>
            {sourceLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium" htmlFor="game-level-select">
            {"trackNumber" in (config.levels[0] ?? {}) ? "Track:" : "Level:"}
          </label>
          <Select
            value={String(levelNumber)}
            onValueChange={(value) => onLevelNumberChange(Number(value))}
          >
            <SelectTrigger id="game-level-select" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.levels.map((level, idx) => (
                <SelectItem
                  key={getLevelIndex(level)}
                  value={String(getLevelIndex(level))}
                >
                  {levelLabel(level, idx)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleStartPreview}>
            {activePreviewUrl === null ? "Start Preview" : "Reload Preview"}
          </Button>

          <Button variant="outline" onClick={handleOpenInNewTab}>
            Open in New Tab ↗
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative rounded overflow-hidden border border-border bg-black">
          {activePreviewUrl === null ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center p-6">
              Launch the shared Pangea Ports shell to jump directly into the selected level.
            </div>
          ) : (
            <iframe
              key={`${String(previewKey)}-${activePreviewUrl}`}
              title={`${GAME_DISPLAY_NAMES[config.game]} preview`}
              src={activePreviewUrl}
              className="absolute inset-0 h-full w-full border-0 bg-black"
              allow="fullscreen"
            />
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground self-center">
            The level selector lives only inside this preview dialog.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
