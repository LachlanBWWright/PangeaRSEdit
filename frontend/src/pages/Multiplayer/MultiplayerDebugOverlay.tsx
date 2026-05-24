import type { MultiplayerDebugOverlayProps } from "./types";

export function MultiplayerDebugOverlay({
  lobby,
  localParticipantId,
  localPlayerIndex,
  isHost,
  connectionStatus,
  rtcStatusText,
  packetCounts,
  runtimeDebugStats,
  nativeDebugStats,
  errorText,
}: MultiplayerDebugOverlayProps) {
  return (
    <section className="space-y-2 rounded-md border border-emerald-800 bg-emerald-950/30 p-3">
      <div className="text-sm font-semibold text-emerald-200">
        Multiplayer Debug
      </div>
      <div className="space-y-1 break-words text-xs text-emerald-100">
        <div>
          <strong>Lobby:</strong> {lobby?.id ?? "none"}
        </div>
        <div>
          <strong>Join code:</strong> {lobby?.joinCode ?? "none"}
        </div>
        <div>
          <strong>Participant:</strong> {localParticipantId ?? "none"}
        </div>
        <div>
          <strong>Player index:</strong> {String(localPlayerIndex ?? -1)}
        </div>
        <div>
          <strong>Role:</strong> {isHost ? "host" : "client"}
        </div>
        <div>
          <strong>SignalR state:</strong> {connectionStatus}
        </div>
        <div>
          <strong>ICE state:</strong> n/a
        </div>
        <div>
          <strong>Data-channel state:</strong> {rtcStatusText}
        </div>
        <div>
          <strong>Packet counts:</strong> {JSON.stringify(packetCounts)}
        </div>
        <div>
          <strong>PNET sent reliable/unreliable:</strong>{" "}
          {String(runtimeDebugStats.sentReliable)}/
          {String(runtimeDebugStats.sentUnreliable)}
        </div>
        <div>
          <strong>PNET recv/poll/reject:</strong>{" "}
          {String(runtimeDebugStats.received)}/{String(runtimeDebugStats.polled)}
          /{String(runtimeDebugStats.rejected)}
        </div>
        <div>
          <strong>PNET impaired drop/delay:</strong>{" "}
          {String(runtimeDebugStats.impairedDropped)}/
          {String(runtimeDebugStats.impairedDelayed)}
        </div>
        <div>
          <strong>PNET queue depth:</strong>{" "}
          {String(runtimeDebugStats.queueDepth)}
        </div>
        <div>
          <strong>PNET last:</strong>{" "}
          {runtimeDebugStats.lastPacketDirection ?? "n/a"} type{" "}
          {String(runtimeDebugStats.lastPacketType ?? "n/a")} seq{" "}
          {String(runtimeDebugStats.lastPacketSequence ?? "n/a")}
        </div>
        <div>
          <strong>Current game frame:</strong>{" "}
          {nativeDebugStats.frameNumber ?? "n/a"}
        </div>
        <div>
          <strong>Last sync hash:</strong>{" "}
          {nativeDebugStats.lastSyncHash ?? "n/a"}
        </div>
        <div>
          <strong>Game desync flag:</strong>{" "}
          {nativeDebugStats.hasDesync === null
            ? "n/a"
            : nativeDebugStats.hasDesync
              ? "yes"
              : "no"}
        </div>
        <div>
          <strong>Visual events sent/applied:</strong>{" "}
          {nativeDebugStats.lastVisualEventSequence ?? "n/a"}/
          {nativeDebugStats.appliedVisualEventSequence ?? "n/a"}
        </div>
        <div>
          <strong>Visual events duplicate/stale:</strong>{" "}
          {nativeDebugStats.duplicateVisualEventCount ?? "n/a"}/
          {nativeDebugStats.staleVisualEventCount ?? "n/a"}
        </div>
        <div>
          <strong>Last network error:</strong> {errorText ?? "none"}
        </div>
        <div>
          <strong>Last PNET error:</strong>{" "}
          {runtimeDebugStats.lastError ?? "none"}
        </div>
        <div>
          <strong>TURN relay usage:</strong> n/a
        </div>
      </div>
    </section>
  );
}
