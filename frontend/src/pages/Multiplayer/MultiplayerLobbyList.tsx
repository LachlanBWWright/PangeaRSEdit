import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  readonly onOpenCreate: () => void;
}

function LobbyMetaPill({
  className,
  label,
}: {
  readonly className?: string;
  readonly label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function MultiplayerLobbyList({
  lobbies,
  busy,
  onQuickJoin,
  onOpenCreate,
}: MultiplayerLobbyListProps) {
  if (lobbies.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-start gap-3 py-8">
          <div>
            <div className="text-base font-semibold">No open lobbies</div>
            <div className="text-sm text-muted-foreground">
              Create one to get a match started.
            </div>
          </div>
          <Button type="button" onClick={onOpenCreate}>
            Create Lobby
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {lobbies.map((lobby) => {
        const joinable = isLobbyJoinable(lobby);
        return (
          <Card key={lobby.id}>
            <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-base font-semibold">
                    {formatLobbyGameLabel(lobby.gameId)} ·{" "}
                    {formatLobbyModeLabel(lobby.mode)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Track / Level {lobby.trackOrLevel}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LobbyMetaPill
                    label={`${String(lobby.playerCount)}/${String(lobby.maxPlayers)} players`}
                  />
                  <LobbyMetaPill label={`Join code ${lobby.joinCode}`} />
                  <LobbyMetaPill label={getLobbyAvailabilityLabel(lobby)} />
                </div>
                <div className="break-all text-xs text-muted-foreground">
                  Lobby ID {lobby.id}
                </div>
              </div>
              <Button
                type="button"
                variant={joinable ? "default" : "outline"}
                disabled={busy || !joinable}
                onClick={() => {
                  onQuickJoin(lobby.id);
                }}
              >
                {joinable ? "Join Lobby" : getLobbyAvailabilityLabel(lobby)}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
