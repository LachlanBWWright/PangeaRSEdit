import { Button } from "@/components/ui/button";

interface HostStartControlsProps {
  readonly hasLocalParticipant: boolean;
  readonly localParticipantIsReady: boolean;
  readonly busy: boolean;
  readonly isHost: boolean;
  readonly canStart: boolean;
  readonly canForceStart: boolean;
  readonly onToggleReady: () => void;
  readonly onStart: () => void;
  readonly onStartAnyway: () => void;
  readonly onLeave: () => void;
}

export function HostStartControls({
  hasLocalParticipant,
  localParticipantIsReady,
  busy,
  isHost,
  canStart,
  canForceStart,
  onToggleReady,
  onStart,
  onStartAnyway,
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
