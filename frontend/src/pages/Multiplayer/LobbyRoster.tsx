import { Button } from "@/components/ui/button";
import { getPlayerReadyLabel } from "@/multiplayer/lobbyDisplay";
import type { MultiplayerLobbyPlayer } from "@/multiplayer/types";

interface LobbyRosterProps {
  readonly players: readonly MultiplayerLobbyPlayer[];
  readonly isHost: boolean;
  readonly busy: boolean;
  readonly onRemoveParticipant: (participantId: string) => void;
}

export function LobbyRoster({
  players,
  isHost,
  busy,
  onRemoveParticipant,
}: LobbyRosterProps) {
  return (
    <div>
      {players.map((player) => (
        <div
          key={player.participantId}
          className="flex items-center justify-between gap-3 border-b border-border/70 py-2 last:border-b-0"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              {player.playerIndex}. {player.displayName}
            </div>
            <div className="truncate text-muted-foreground">
              {player.isHost ? "Host · " : ""}
              <span className={player.isReady ? "text-emerald-600" : "text-amber-600"}>
                {getPlayerReadyLabel(player)}
              </span>
              {` · ${player.region} · ${String(player.pingMs)} ms`}
            </div>
          </div>
          {isHost && !player.isHost ? (
            <Button
              type="button"
              size="default"
              variant="outline"
              disabled={busy}
              onClick={() => {
                onRemoveParticipant(player.participantId);
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
