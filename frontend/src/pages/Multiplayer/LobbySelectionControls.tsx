import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CROMAG_TAG_DURATION_OPTIONS,
  defaultTrackForMode,
  getModeOptions,
  getTrackOptions,
  usesCroMagTagDuration,
} from "@/multiplayer/menuOptions";
import type { MultiplayerSessionViewProps } from "./types";

type LobbySelectionControlsProps = Pick<MultiplayerSessionViewProps, "lobby" | "busy" | "onUpdateSelection">;

export function LobbySelectionControls({ lobby, busy, onUpdateSelection }: LobbySelectionControlsProps) {
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <Label htmlFor="lobby-mode">Mode</Label>
        <Select
          value={lobby.mode}
          disabled={busy}
          onValueChange={(mode) => onUpdateSelection(mode, defaultTrackForMode(lobby.gameId, mode), lobby.tagDurationMinutes)}
        >
          <SelectTrigger id="lobby-mode"><SelectValue placeholder="Select mode" /></SelectTrigger>
          <SelectContent>
            {getModeOptions(lobby.gameId).map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="lobby-map">Map</Label>
        <Select
          value={lobby.trackOrLevel}
          disabled={busy}
          onValueChange={(track) => onUpdateSelection(lobby.mode, track, lobby.tagDurationMinutes)}
        >
          <SelectTrigger id="lobby-map"><SelectValue placeholder="Select map" /></SelectTrigger>
          <SelectContent>
            {getTrackOptions(lobby.gameId, lobby.mode).map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {usesCroMagTagDuration(lobby.gameId, lobby.mode) ? (
        <div className="grid gap-1">
          <Label htmlFor="lobby-tag-duration">Tag Duration</Label>
          <Select
            value={String(lobby.tagDurationMinutes)}
            disabled={busy}
            onValueChange={(value) => onUpdateSelection(lobby.mode, lobby.trackOrLevel, Number.parseInt(value, 10))}
          >
            <SelectTrigger id="lobby-tag-duration"><SelectValue placeholder="Select tag duration" /></SelectTrigger>
            <SelectContent>
              {CROMAG_TAG_DURATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
