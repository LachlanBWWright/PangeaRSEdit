import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatLobbyGameLabel,
  formatLobbyModeLabel,
  getLobbyAvailabilityLabel,
  isLobbyJoinable,
} from "@/multiplayer/lobbyDisplay";
import type { MultiplayerLobbySummary } from "@/multiplayer/types";
import { getLevelOptionLabel, getTrackOptions } from "@/multiplayer/menuOptions";

interface MultiplayerLobbyListProps {
  readonly lobbies: readonly MultiplayerLobbySummary[];
  readonly busy: boolean;
  readonly listUnavailable: boolean;
  readonly onClearFilters?: () => void;
  readonly onQuickJoin: (lobbyId: string) => void;
}

export function MultiplayerLobbyList({
  lobbies,
  busy,
  listUnavailable,
  onClearFilters,
  onQuickJoin,
}: MultiplayerLobbyListProps) {
  if (lobbies.length === 0) {
    if (listUnavailable) return null;
    return (
      <Card className="flex min-h-0 flex-1 items-center justify-center border-dashed shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
          <p className="text-base font-semibold">
            {onClearFilters ? "No lobbies match your filters" : "No public lobbies"}
          </p>
          <p className="text-sm text-muted-foreground">
            {onClearFilters ? "See all public lobbies." : "Create a lobby or join a friend with a code."}
          </p>
          {onClearFilters ? (
            <Button variant="outline" className="mt-2" disabled={busy} onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto rounded-lg border border-border">
      {lobbies.map((lobby) => {
        const joinable = isLobbyJoinable(lobby);
        const gameName = formatLobbyGameLabel(lobby.gameId);
        const mapName = getLevelOptionLabel(getTrackOptions(lobby.gameId, lobby.mode), lobby.trackOrLevel);
        const openSlots = Math.max(0, lobby.maxPlayers - lobby.playerCount);
        return (
          <li
            key={lobby.id}
            className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="font-semibold">
                  {gameName}
                </div>
                <div className="text-sm text-muted-foreground">{formatLobbyModeLabel(lobby.mode)}</div>
              </div>
              <div>{mapName}</div>
              <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                <span>{openSlots} {openSlots === 1 ? "open slot" : "open slots"}</span>
                <span>Join code {lobby.joinCode}</span>
              </div>
            </div>
            {joinable ? (
              <Button
                type="button"
                className="shrink-0"
                aria-label={`Join lobby for ${gameName} on ${mapName}, code ${lobby.joinCode}`}
                disabled={busy}
                onClick={() => {
                  onQuickJoin(lobby.id);
                }}
              >
                Join lobby
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">{getLobbyAvailabilityLabel(lobby)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
