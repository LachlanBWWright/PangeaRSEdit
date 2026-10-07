import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
      {isWaitingForPlayers ? (
        <p className="text-muted-foreground" aria-live="polite">
          {isHost ? startHelp : localParticipantIsReady ? "You’re ready. Waiting for the host to start." : "Ready up when you’re set to play."}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {isWaitingForPlayers ? (
          <Button
            type="button"
            size="default"
            variant={localParticipantIsReady ? "outline" : "default"}
            disabled={busy || !hasLocalParticipant}
            onClick={onToggleReady}
          >
            {localParticipantIsReady ? "Not ready" : "Ready up"}
          </Button>
        ) : null}
        {isHost && isWaitingForPlayers ? (
          <Button
            type="button"
            size="default"
            variant={localParticipantIsReady ? "default" : "outline"}
            disabled={busy || !canStart}
            onClick={onStart}
          >
            {lobbyState === "match_ended" ? "Start rematch" : "Start match"}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onLeave}
        >
          Leave Lobby
        </Button>
        {isHost && isWaitingForPlayers && canForceStart ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={busy}>
                More match actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-72">
              <DropdownMenuLabel className="whitespace-normal text-xs text-muted-foreground">
                Start even when some players are not ready.
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={onStartAnyway}>
                {lobbyState === "match_ended" ? "Rematch Anyway" : "Start Anyway"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
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
