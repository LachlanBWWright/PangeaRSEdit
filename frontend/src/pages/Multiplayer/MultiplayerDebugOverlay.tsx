import type { MultiplayerDebugOverlayProps } from "./types";

interface DebugRowProps {
  readonly label: string;
  readonly value: string;
}

function DebugRow({ label, value }: DebugRowProps) {
  return (
    <>
      <dt className="min-w-0 truncate text-emerald-300">{label}</dt>
      <dd className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-emerald-50">
        {value}
      </dd>
    </>
  );
}

function formatPacketCounts(packetCounts: Readonly<Record<string, number>>) {
  const entries = Object.entries(packetCounts);

  if (entries.length === 0) {
    return "none";
  }

  return entries.map(([key, value]) => `${key}:${String(value)}`).join(" ");
}

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
    <section className="min-w-0 space-y-2 border-t border-emerald-800 pt-3">
      <div className="truncate text-sm font-semibold text-emerald-200">
        Multiplayer Debug
      </div>
      <dl className="grid min-w-0 grid-cols-[minmax(5.75rem,0.72fr)_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
        <DebugRow label="Lobby" value={lobby?.id ?? "none"} />
        <DebugRow label="Join code" value={lobby?.joinCode ?? "none"} />
        <DebugRow label="Participant" value={localParticipantId ?? "none"} />
        <DebugRow
          label="Player"
          value={String(localPlayerIndex ?? -1)}
        />
        <DebugRow label="Role" value={isHost ? "host" : "client"} />
        <DebugRow label="SignalR" value={connectionStatus} />
        <DebugRow label="ICE" value="n/a" />
        <DebugRow label="Data channel" value={rtcStatusText} />
        <DebugRow label="Packets" value={formatPacketCounts(packetCounts)} />
        <DebugRow
          label="PNET sent"
          value={`${String(runtimeDebugStats.sentReliable)}/${String(
            runtimeDebugStats.sentUnreliable,
          )}`}
        />
        <DebugRow
          label="PNET recv"
          value={`${String(runtimeDebugStats.received)}/${String(
            runtimeDebugStats.polled,
          )}/${String(runtimeDebugStats.rejected)}`}
        />
        <DebugRow
          label="Impairment"
          value={`${String(runtimeDebugStats.impairedDropped)}/${String(
            runtimeDebugStats.impairedDelayed,
          )}`}
        />
        <DebugRow
          label="Queue"
          value={String(runtimeDebugStats.queueDepth)}
        />
        <DebugRow
          label="PNET last"
          value={`${runtimeDebugStats.lastPacketDirection ?? "n/a"} type ${String(
            runtimeDebugStats.lastPacketType ?? "n/a",
          )} seq ${String(runtimeDebugStats.lastPacketSequence ?? "n/a")}`}
        />
        <DebugRow
          label="Frame"
          value={String(nativeDebugStats.frameNumber ?? "n/a")}
        />
        <DebugRow
          label="Sync hash"
          value={String(nativeDebugStats.lastSyncHash ?? "n/a")}
        />
        <DebugRow
          label="Desync"
          value={
            nativeDebugStats.hasDesync === null
              ? "n/a"
              : nativeDebugStats.hasDesync
                ? "yes"
                : "no"
          }
        />
        <DebugRow
          label="Events"
          value={`${String(
            nativeDebugStats.lastVisualEventSequence ?? "n/a",
          )}/${String(nativeDebugStats.appliedVisualEventSequence ?? "n/a")}`}
        />
        <DebugRow
          label="Event drops"
          value={`${String(
            nativeDebugStats.duplicateVisualEventCount ?? "n/a",
          )}/${String(nativeDebugStats.staleVisualEventCount ?? "n/a")}`}
        />
        <DebugRow label="Network err" value={errorText ?? "none"} />
        <DebugRow
          label="PNET err"
          value={runtimeDebugStats.lastError ?? "none"}
        />
        <DebugRow label="TURN relay" value="n/a" />
      </dl>
    </section>
  );
}
