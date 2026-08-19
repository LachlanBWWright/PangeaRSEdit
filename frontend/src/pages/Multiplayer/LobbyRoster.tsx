import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPlayerReadyLabel } from "@/multiplayer/lobbyDisplay";
import type { MultiplayerLobbyPlayer } from "@/multiplayer/types";

interface LobbyRosterProps {
  readonly players: readonly MultiplayerLobbyPlayer[];
  readonly isHost: boolean;
  readonly busy: boolean;
  readonly onRemoveParticipant: (participantId: string) => void;
}

function RosterPill({
  className,
  label,
}: {
  readonly className?: string;
  readonly label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function LobbyRoster({
  players,
  isHost,
  busy,
  onRemoveParticipant,
}: LobbyRosterProps) {
  return (
    <div className="grid gap-3">
      {players.map((player) => (
        <div
          key={player.participantId}
          className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="space-y-2">
            <div className="font-medium">
              {player.playerIndex}. {player.displayName}
            </div>
            <div className="flex flex-wrap gap-2">
              {player.isHost ? (
                <RosterPill className="border-blue-500/40 text-blue-600" label="Host" />
              ) : null}
              <RosterPill
                className={
                  player.isReady
                    ? "border-emerald-500/40 text-emerald-600"
                    : "border-amber-500/40 text-amber-600"
                }
                label={getPlayerReadyLabel(player)}
              />
              <RosterPill label={player.region} />
              <RosterPill label={`${String(player.pingMs)} ms`} />
            </div>
          </div>
          {isHost && !player.isHost ? (
            <Button
              type="button"
              size="sm"
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
