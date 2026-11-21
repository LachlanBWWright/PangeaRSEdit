import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JOIN_GAME_FILTER_OPTIONS,
  JOIN_MODE_FILTER_OPTIONS,
  type JoinGameFilter,
  type JoinModeFilter,
  toJoinGameFilter,
  toJoinModeFilter,
} from "@/multiplayer/menuOptions";

interface MultiplayerLobbyFiltersProps {
  readonly joinGameFilter: JoinGameFilter;
  readonly joinModeFilter: JoinModeFilter;
  readonly busy: boolean;
  readonly onJoinGameFilterChange: (value: JoinGameFilter) => void;
  readonly onJoinModeFilterChange: (value: JoinModeFilter) => void;
  readonly onRefresh: () => void;
}

export function MultiplayerLobbyFilters({
  joinGameFilter,
  joinModeFilter,
  busy,
  onJoinGameFilterChange,
  onJoinModeFilterChange,
  onRefresh,
}: MultiplayerLobbyFiltersProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 sm:w-fit sm:grid-cols-[10rem_10rem_auto]">
      <div className="min-w-0">
        <Label className="sr-only">Game filter</Label>
        <Select
          disabled={busy}
          value={joinGameFilter}
          onValueChange={(value) => {
            onJoinGameFilterChange(toJoinGameFilter(value));
          }}
        >
          <SelectTrigger
            aria-label="Game filter"
            className="h-9 w-full min-w-0"
          >
            <SelectValue placeholder="Filter by game" />
          </SelectTrigger>
          <SelectContent>
            {JOIN_GAME_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0">
        <Label className="sr-only">Mode filter</Label>
        <Select
          disabled={busy}
          value={joinModeFilter}
          onValueChange={(value) => {
            onJoinModeFilterChange(toJoinModeFilter(value));
          }}
        >
          <SelectTrigger
            aria-label="Mode filter"
            className="h-9 w-full min-w-0"
          >
            <SelectValue placeholder="Filter by mode" />
          </SelectTrigger>
          <SelectContent>
            {JOIN_MODE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={busy}
        aria-label="Refresh lobbies"
        onClick={onRefresh}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}
