import { Button } from "@/components/ui/button";

interface HostStartControlsProps {
  readonly hasLocalParticipant: boolean;
  readonly localParticipantIsReady: boolean;
  readonly busy: boolean;
  readonly isHost: boolean;
  readonly canStart: boolean;
  readonly canForceStart: boolean;
  readonly canEndMatch: boolean;
  readonly lobbyState: string;
  readonly readyPlayerCount: number;
  readonly playerCount: number;
  readonly onToggleReady: () => void;
  readonly onStart: () => void;
  readonly onStartAnyway: () => void;
  readonly onEndMatch: () => void;
  readonly onLeave: () => void;
}

export function HostStartControls({
  hasLocalParticipant,
  localParticipantIsReady,
  busy,
  isHost,
  canStart,
  canForceStart,
  canEndMatch,
  lobbyState,
  readyPlayerCount,
  playerCount,
  onToggleReady,
  onStart,
  onStartAnyway,
  onEndMatch,
  onLeave,
}: HostStartControlsProps) {
  const isWaitingForPlayers =
    lobbyState === "open" || lobbyState === "match_ended";
  const startHelp =
    playerCount < 2
      ? "Waiting for one more player"
      : `${readyPlayerCount} of ${playerCount} players ready`;

  return (
    <div className="space-y-2">
      {isHost && isWaitingForPlayers ? (
        <p className="text-muted-foreground" aria-live="polite">
          {startHelp}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {isWaitingForPlayers ? (
          <Button
            type="button"
            size="sm"
            disabled={busy || !hasLocalParticipant}
            onClick={onToggleReady}
          >
            {localParticipantIsReady ? "Set Not Ready" : "Set Ready"}
          </Button>
        ) : null}
        {isHost && isWaitingForPlayers ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={busy || !canStart}
              onClick={onStart}
            >
              {lobbyState === "match_ended" ? "Start Rematch" : "Start"}
            </Button>
            {canForceStart ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={onStartAnyway}
              >
                {lobbyState === "match_ended"
                  ? "Rematch Anyway"
                  : "Start Anyway"}
              </Button>
            ) : null}
          </>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onLeave}
        >
          Leave Lobby
        </Button>
      </div>
      {isHost && canEndMatch ? (
        <div className="border-t border-border pt-2">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={onEndMatch}
          >
            End Match
          </Button>
        </div>
      ) : null}
    </div>
  );
}
