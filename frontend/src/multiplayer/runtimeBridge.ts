import { Result, err, ok } from "neverthrow";
import { z } from "zod";
import { decodeMultiplayerPacket } from "./protocol";

const packetSchema = z.instanceof(ArrayBuffer);

export interface MultiplayerRuntimeTransport {
  readonly sendReliable: (bytes: ArrayBuffer) => Result<void, string>;
  readonly sendUnreliable: (bytes: ArrayBuffer) => Result<void, string>;
  readonly reportDesync: (
    frame: number,
    localHash: number,
    remoteHash: number,
  ) => void;
  readonly reportMatchEnded: (reason: number) => void;
}

export interface MultiplayerRuntimeManagedTransport extends MultiplayerRuntimeTransport {
  readonly subscribeIncoming: (
    onPacket: (bytes: ArrayBuffer) => void,
  ) => () => void;
}

export interface MultiplayerRuntimeBridgeConfig {
  readonly isHost: boolean;
  readonly localPlayerIndex: number;
  readonly playerCount: number;
  readonly matchSeed: number;
}

export interface MultiplayerRuntimeBridge {
  readonly isEnabled: () => boolean;
  readonly isHost: () => boolean;
  readonly getLocalPlayerIndex: () => number;
  readonly getPlayerCount: () => number;
  readonly getMatchSeed: () => number;
  readonly sendReliable: (bytes: ArrayBuffer) => boolean;
  readonly sendUnreliable: (bytes: ArrayBuffer) => boolean;
  readonly pollMessage: (maxByteCount: number) => ArrayBuffer | null;
  readonly nowMilliseconds: () => number;
  readonly reportDesync: (
    frame: number,
    localHash: number,
    remoteHash: number,
  ) => void;
  readonly reportMatchEnded: (reason: number) => void;
  readonly enqueueIncoming: (bytes: ArrayBuffer) => Result<void, string>;
}

interface RuntimeBridgeWindow {
  PangeaNet?: {
    isEnabled: () => boolean;
    isHost: () => boolean;
    getLocalPlayerIndex: () => number;
    getPlayerCount: () => number;
    getMatchSeed: () => number;
    sendReliable: (bytes: ArrayBuffer) => boolean;
    sendUnreliable: (bytes: ArrayBuffer) => boolean;
    pollMessage: (maxByteCount: number) => ArrayBuffer | null;
    nowMilliseconds: () => number;
    reportDesync: (
      frame: number,
      localHash: number,
      remoteHash: number,
    ) => void;
    reportMatchEnded: (reason: number) => void;
  };
}

function cloneBuffer(buffer: ArrayBuffer): ArrayBuffer {
  const copy = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buffer));
  return copy;
}

function shouldTraceRuntimePackets(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    new URLSearchParams(window.location.search).get("multiplayerDebug") === "1"
  );
}

function tracePacket(
  direction: "send" | "recv" | "poll",
  bytes: ArrayBuffer,
): void {
  if (!shouldTraceRuntimePackets()) {
    return;
  }
  const view = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16));
  console.debug(
    `[PangeaNet] ${direction} bytes=${bytes.byteLength}`,
    Array.from(view),
  );
}

export function createMultiplayerRuntimeBridge(
  config: MultiplayerRuntimeBridgeConfig,
  transport: MultiplayerRuntimeTransport,
): MultiplayerRuntimeBridge {
  const maxIncomingQueueLength = 256;
  const incomingQueue: {
    readonly bytes: ArrayBuffer;
    readonly isSnapshot: boolean;
  }[] = [];

  const dropOldestSnapshot = (): boolean => {
    const snapshotIndex = incomingQueue.findIndex((item) => item.isSnapshot);
    if (snapshotIndex < 0) {
      return false;
    }
    incomingQueue.splice(snapshotIndex, 1);
    return true;
  };

  return {
    isEnabled: () => true,
    isHost: () => config.isHost,
    getLocalPlayerIndex: () => config.localPlayerIndex,
    getPlayerCount: () => config.playerCount,
    getMatchSeed: () => config.matchSeed,
    sendReliable: (bytes) => {
      tracePacket("send", bytes);
      return transport.sendReliable(bytes).isOk();
    },
    sendUnreliable: (bytes) => {
      tracePacket("send", bytes);
      return transport.sendUnreliable(bytes).isOk();
    },
    pollMessage: (maxByteCount) => {
      const next = incomingQueue[0];
      if (!next) {
        return null;
      }
      if (next.bytes.byteLength > maxByteCount) {
        return null;
      }
      incomingQueue.shift();
      tracePacket("poll", next.bytes);
      return cloneBuffer(next.bytes);
    },
    nowMilliseconds: () => performance.now(),
    reportDesync: (frame, localHash, remoteHash) => {
      transport.reportDesync(frame, localHash, remoteHash);
    },
    reportMatchEnded: (reason) => {
      transport.reportMatchEnded(reason);
    },
    enqueueIncoming: (bytes) => {
      const parsed = packetSchema.safeParse(bytes);
      if (!parsed.success) {
        return err("Invalid packet payload");
      }
      const decoded = decodeMultiplayerPacket(parsed.data);
      const isSnapshot =
        decoded.isOk() && decoded.value.envelope.messageType === "hostSnapshot";
      if (incomingQueue.length >= maxIncomingQueueLength) {
        if (!dropOldestSnapshot()) {
          if (isSnapshot) {
            return ok(undefined);
          }
          return err("Incoming runtime packet queue is full");
        }
      }
      const copied = cloneBuffer(parsed.data);
      tracePacket("recv", copied);
      incomingQueue.push({
        bytes: copied,
        isSnapshot,
      });
      return ok(undefined);
    },
  };
}

export function installMultiplayerRuntimeBridge(
  target: RuntimeBridgeWindow,
  bridge: MultiplayerRuntimeBridge,
): () => void {
  target.PangeaNet = {
    isEnabled: bridge.isEnabled,
    isHost: bridge.isHost,
    getLocalPlayerIndex: bridge.getLocalPlayerIndex,
    getPlayerCount: bridge.getPlayerCount,
    getMatchSeed: bridge.getMatchSeed,
    sendReliable: bridge.sendReliable,
    sendUnreliable: bridge.sendUnreliable,
    pollMessage: bridge.pollMessage,
    nowMilliseconds: bridge.nowMilliseconds,
    reportDesync: bridge.reportDesync,
    reportMatchEnded: bridge.reportMatchEnded,
  };

  return () => {
    Reflect.deleteProperty(target, "PangeaNet");
  };
}

export function createManagedMultiplayerRuntimeBridge(
  config: MultiplayerRuntimeBridgeConfig,
  transport: MultiplayerRuntimeManagedTransport,
): {
  readonly bridge: MultiplayerRuntimeBridge;
  readonly dispose: () => void;
} {
  const bridge = createMultiplayerRuntimeBridge(config, transport);
  const unsubscribe = transport.subscribeIncoming((bytes) => {
    bridge.enqueueIncoming(bytes);
  });

  return {
    bridge,
    dispose: unsubscribe,
  };
}
