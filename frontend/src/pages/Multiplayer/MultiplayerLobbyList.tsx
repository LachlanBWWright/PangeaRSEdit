import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatLobbyGameLabel,
  formatLobbyModeLabel,
  getLobbyAvailabilityLabel,
  isLobbyJoinable,
} from "@/multiplayer/lobbyDisplay";
import type { MultiplayerLobbySummary } from "@/multiplayer/types";

interface MultiplayerLobbyListProps {
  readonly lobbies: readonly MultiplayerLobbySummary[];
  readonly busy: boolean;
  readonly onQuickJoin: (lobbyId: string) => void;
}

export function MultiplayerLobbyList({
  lobbies,
  busy,
  onQuickJoin,
}: MultiplayerLobbyListProps) {
  if (lobbies.length === 0) {
    return (
      <Card className="flex min-h-0 flex-1 items-center justify-center border-dashed shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
          <p className="text-base font-semibold">No open lobbies</p>
          <p className="text-sm text-muted-foreground">
            Create a lobby or try a different filter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto rounded-lg border border-border">
      {lobbies.map((lobby) => {
        const joinable = isLobbyJoinable(lobby);
        return (
          <div
            key={lobby.id}
            className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="font-semibold">
                  {formatLobbyGameLabel(lobby.gameId)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatLobbyModeLabel(lobby.mode)} · Track / Level {lobby.trackOrLevel}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {String(lobby.playerCount)}/{String(lobby.maxPlayers)} players · Join code {lobby.joinCode}
              </div>
              <div className="break-all text-xs text-muted-foreground">
                {lobby.id}
              </div>
            </div>
            <Button
              type="button"
              size="default"
              className="shrink-0"
              variant={joinable ? "default" : "outline"}
              disabled={busy || !joinable}
              onClick={() => {
                onQuickJoin(lobby.id);
              }}
            >
              {joinable ? "Join Lobby" : getLobbyAvailabilityLabel(lobby)}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
