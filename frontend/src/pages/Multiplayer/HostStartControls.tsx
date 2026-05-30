import { Button } from "@/components/ui/button";

interface HostStartControlsProps {
  readonly hasLocalParticipant: boolean;
  readonly localParticipantIsReady: boolean;
  readonly busy: boolean;
  readonly isHost: boolean;
  readonly canStart: boolean;
  readonly canForceStart: boolean;
  readonly canEndMatch: boolean;
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
  onToggleReady,
  onStart,
  onStartAnyway,
  onEndMatch,
  onLeave,
}: HostStartControlsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={busy || !hasLocalParticipant}
        onClick={onToggleReady}
      >
        {localParticipantIsReady ? "Set Not Ready" : "Set Ready"}
      </Button>
      {isHost ? (
        <>
          <Button
            type="button"
            disabled={busy || !canStart}
            onClick={onStart}
          >
            Start
          </Button>
          {canForceStart ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onStartAnyway}
            >
              Start Anyway
            </Button>
          ) : null}
          {canEndMatch ? (
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={onEndMatch}
            >
              End Match
            </Button>
          ) : null}
        </>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={onLeave}
      >
        Leave Lobby
      </Button>
    </div>
  );
}
