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
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <div className="space-y-2">
        <Label>Game Filter</Label>
        <Select
          value={joinGameFilter}
          onValueChange={(value) => {
            onJoinGameFilterChange(toJoinGameFilter(value));
          }}
        >
          <SelectTrigger>
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

      <div className="space-y-2">
        <Label>Mode Filter</Label>
        <Select
          value={joinModeFilter}
          onValueChange={(value) => {
            onJoinModeFilterChange(toJoinModeFilter(value));
          }}
        >
          <SelectTrigger>
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
