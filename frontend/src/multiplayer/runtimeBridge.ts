import { Result, err, ok } from "neverthrow";
import { z } from "zod";
import {
  PNET_PACKET_TYPE_HOST_SNAPSHOT,
  PNET_MAGIC,
  PNET_PLAYER_NA,
  decodePnetHeader,
  isPnetHostPacketType,
} from "./pnetPacket";
import { decodeMultiplayerPacket } from "./protocol";

const packetSchema = z.instanceof(ArrayBuffer);

export interface MultiplayerRuntimeDebugStats {
  readonly sentReliable: number;
  readonly sentUnreliable: number;
  readonly received: number;
  readonly polled: number;
  readonly rejected: number;
  readonly impairedDropped: number;
  readonly impairedDelayed: number;
  readonly queueDepth: number;
  readonly lastPacketType: number | null;
  readonly lastPacketSequence: number | null;
  readonly lastPacketDirection:
    | "send"
    | "recv"
    | "poll"
    | "reject"
    | "impair-drop"
    | null;
  readonly lastError: string | null;
}

export interface MultiplayerNetworkDebugOptions {
  readonly latencyMs: number;
  readonly packetLossPercent: number;
  readonly packetBurstPercent: number;
  readonly packetBurstSize: number;
}

const runtimeDebugStats: MultiplayerRuntimeDebugStats = {
  sentReliable: 0,
  sentUnreliable: 0,
  received: 0,
  polled: 0,
  rejected: 0,
  impairedDropped: 0,
  impairedDelayed: 0,
  queueDepth: 0,
  lastPacketType: null,
  lastPacketSequence: null,
  lastPacketDirection: null,
  lastError: null,
};

const defaultNetworkDebugOptions: MultiplayerNetworkDebugOptions = {
  latencyMs: 0,
  packetLossPercent: 0,
  packetBurstPercent: 0,
  packetBurstSize: 1,
};

let networkDebugOptions = defaultNetworkDebugOptions;
let networkDebugBurstRemaining = 0;

function updateRuntimeDebugStats(
  direction: "send" | "recv" | "poll" | "reject" | "impair-drop",
  bytes: ArrayBuffer | null,
  error: string | null,
): void {
  const decodedPnet = bytes ? decodePnetHeader(bytes) : err("No PNET bytes");
  const packetType = decodedPnet.isOk() ? decodedPnet.value.packetType : null;
  const packetSequence = decodedPnet.isOk() ? decodedPnet.value.sequence : null;
  Object.assign(runtimeDebugStats, {
    lastPacketType: packetType,
    lastPacketSequence: packetSequence,
    lastPacketDirection: direction,
    lastError: error,
  });
}

export function getMultiplayerRuntimeDebugStats(): MultiplayerRuntimeDebugStats {
  return {
    ...runtimeDebugStats,
  };
}

export function setMultiplayerNetworkDebugOptions(
  options: MultiplayerNetworkDebugOptions,
): void {
  networkDebugOptions = {
    latencyMs: Math.max(0, Math.round(options.latencyMs)),
    packetLossPercent: Math.min(
      100,
      Math.max(0, Math.round(options.packetLossPercent)),
    ),
    packetBurstPercent: Math.min(
      100,
      Math.max(0, Math.round(options.packetBurstPercent)),
    ),
    packetBurstSize: Math.max(1, Math.round(options.packetBurstSize)),
  };
  if (networkDebugOptions.packetBurstPercent === 0) {
    networkDebugBurstRemaining = 0;
  }
}

export function getMultiplayerNetworkDebugOptions(): MultiplayerNetworkDebugOptions {
  return networkDebugOptions;
}

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
  readonly hostPlayerIndex: number;
  readonly matchIdLow: number;
  readonly matchIdHigh: number;
}

export interface MultiplayerRuntimeBridge {
  readonly isEnabled: () => boolean;
  readonly isHost: () => boolean;
  readonly getLocalPlayerIndex: () => number;
  readonly getPlayerCount: () => number;
  readonly getMatchSeed: () => number;
  readonly getMatchIdLow: () => number;
  readonly getMatchIdHigh: () => number;
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
    getMatchIdLow: () => number;
    getMatchIdHigh: () => number;
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

function shouldDropForNetworkDebug(): boolean {
  if (networkDebugBurstRemaining > 0) {
    networkDebugBurstRemaining -= 1;
    return true;
  }

  if (Math.random() * 100 < networkDebugOptions.packetBurstPercent) {
    networkDebugBurstRemaining = networkDebugOptions.packetBurstSize - 1;
    return true;
  }

  return Math.random() * 100 < networkDebugOptions.packetLossPercent;
}

function recordNetworkDebugDrop(bytes: ArrayBuffer): void {
  Object.assign(runtimeDebugStats, {
    impairedDropped: runtimeDebugStats.impairedDropped + 1,
  });
  updateRuntimeDebugStats("impair-drop", bytes, "Dropped by debug impairment");
}

function recordNetworkDebugDelay(): void {
  Object.assign(runtimeDebugStats, {
    impairedDelayed: runtimeDebugStats.impairedDelayed + 1,
  });
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

  const decodedPnet = decodePnetHeader(bytes);
  if (decodedPnet.isOk()) {
    console.debug(`[PangeaNet] ${direction} pnet`, decodedPnet.value);
  }
}

function isHostAuthoritativeMessageType(messageType: string): boolean {
  return (
    messageType === "hostSnapshot" ||
    messageType === "hostCorrection" ||
    messageType === "hostEvent" ||
    messageType === "hostPause" ||
    messageType === "hostResume" ||
    messageType === "hostDisconnect" ||
    messageType === "hostInputBundle"
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

  const sendReliableNow = (bytes: ArrayBuffer): boolean => {
    const result = transport.sendReliable(bytes);
    Object.assign(runtimeDebugStats, {
      sentReliable: runtimeDebugStats.sentReliable + 1,
    });
    updateRuntimeDebugStats(
      "send",
      bytes,
      result.isErr() ? result.error : null,
    );
    return result.isOk();
  };

  const sendUnreliableNow = (bytes: ArrayBuffer): boolean => {
    const unreliableResult = transport.sendUnreliable(bytes);
    Object.assign(runtimeDebugStats, {
      sentUnreliable: runtimeDebugStats.sentUnreliable + 1,
    });
    updateRuntimeDebugStats(
      "send",
      bytes,
      unreliableResult.isErr() ? unreliableResult.error : null,
    );
    if (unreliableResult.isOk()) {
      return true;
    }
    return sendReliableNow(bytes);
  };

  const impairOutgoing = (
    bytes: ArrayBuffer,
    sendNow: (packet: ArrayBuffer) => boolean,
  ): boolean => {
    if (shouldDropForNetworkDebug()) {
      recordNetworkDebugDrop(bytes);
      return true;
    }
    if (networkDebugOptions.latencyMs > 0) {
      const copied = cloneBuffer(bytes);
      recordNetworkDebugDelay();
      window.setTimeout(() => {
        sendNow(copied);
      }, networkDebugOptions.latencyMs);
      return true;
    }
    return sendNow(bytes);
  };

  const queueIncoming = (bytes: ArrayBuffer): Result<void, string> => {
    const decodedPnet = decodePnetHeader(bytes);
    const decoded = decodeMultiplayerPacket(bytes);
    const isSnapshot =
      (decoded.isOk() &&
        decoded.value.envelope.messageType === "hostSnapshot") ||
      (decodedPnet.isOk() &&
        decodedPnet.value.packetType === PNET_PACKET_TYPE_HOST_SNAPSHOT);
    if (incomingQueue.length >= maxIncomingQueueLength) {
      if (!dropOldestSnapshot()) {
        if (isSnapshot) {
          Object.assign(runtimeDebugStats, {
            queueDepth: incomingQueue.length,
          });
          return ok(undefined);
        }
        Object.assign(runtimeDebugStats, {
          rejected: runtimeDebugStats.rejected + 1,
          queueDepth: incomingQueue.length,
        });
        updateRuntimeDebugStats(
          "reject",
          bytes,
          "Incoming runtime packet queue is full",
        );
        return err("Incoming runtime packet queue is full");
      }
    }
    const copied = cloneBuffer(bytes);
    tracePacket("recv", copied);
    incomingQueue.push({
      bytes: copied,
      isSnapshot,
    });
    Object.assign(runtimeDebugStats, {
      received: runtimeDebugStats.received + 1,
      queueDepth: incomingQueue.length,
    });
    updateRuntimeDebugStats("recv", copied, null);
    return ok(undefined);
  };

  const impairIncoming = (bytes: ArrayBuffer): Result<void, string> => {
    if (shouldDropForNetworkDebug()) {
      recordNetworkDebugDrop(bytes);
      return ok(undefined);
    }
    if (networkDebugOptions.latencyMs > 0) {
      const copied = cloneBuffer(bytes);
      recordNetworkDebugDelay();
      window.setTimeout(() => {
        queueIncoming(copied);
      }, networkDebugOptions.latencyMs);
      return ok(undefined);
    }
    return queueIncoming(bytes);
  };

  return {
    isEnabled: () => true,
    isHost: () => config.isHost,
    getLocalPlayerIndex: () => config.localPlayerIndex,
    getPlayerCount: () => config.playerCount,
    getMatchSeed: () => config.matchSeed,
    getMatchIdLow: () => config.matchIdLow,
    getMatchIdHigh: () => config.matchIdHigh,
    sendReliable: (bytes) => {
      tracePacket("send", bytes);
      return impairOutgoing(bytes, sendReliableNow);
    },
    sendUnreliable: (bytes) => {
      tracePacket("send", bytes);
      return impairOutgoing(bytes, sendUnreliableNow);
    },
    pollMessage: (maxByteCount) => {
      const next = incomingQueue[0];
      if (!next) {
        Object.assign(runtimeDebugStats, {
          queueDepth: incomingQueue.length,
        });
        return null;
      }
      if (next.bytes.byteLength > maxByteCount) {
        Object.assign(runtimeDebugStats, {
          queueDepth: incomingQueue.length,
        });
        return null;
      }
      incomingQueue.shift();
      tracePacket("poll", next.bytes);
      Object.assign(runtimeDebugStats, {
        polled: runtimeDebugStats.polled + 1,
        queueDepth: incomingQueue.length,
      });
      updateRuntimeDebugStats("poll", next.bytes, null);
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
        Object.assign(runtimeDebugStats, {
          rejected: runtimeDebugStats.rejected + 1,
        });
        updateRuntimeDebugStats("reject", null, "Invalid packet payload");
        return err("Invalid packet payload");
      }

      const decodedPnet = decodePnetHeader(parsed.data);
      if (decodedPnet.isErr() && parsed.data.byteLength >= 4) {
        const view = new DataView(parsed.data);
        if (view.getUint32(0, true) === PNET_MAGIC) {
          Object.assign(runtimeDebugStats, {
            rejected: runtimeDebugStats.rejected + 1,
          });
          updateRuntimeDebugStats("reject", parsed.data, decodedPnet.error);
          return err(`Rejected malformed PNET packet: ${decodedPnet.error}`);
        }
      }
      if (decodedPnet.isOk()) {
        const header = decodedPnet.value;
        if (
          header.matchIdLow !== config.matchIdLow ||
          header.matchIdHigh !== config.matchIdHigh
        ) {
          const message = `Rejected packet with mismatched match identity: got ${String(header.matchIdHigh)}:${String(header.matchIdLow)} expected ${String(config.matchIdHigh)}:${String(config.matchIdLow)}`;
          Object.assign(runtimeDebugStats, {
            rejected: runtimeDebugStats.rejected + 1,
          });
          updateRuntimeDebugStats("reject", parsed.data, message);
          return err(message);
        }
        if (
          !config.isHost &&
          isPnetHostPacketType(header.packetType) &&
          header.playerIndex !== PNET_PLAYER_NA &&
          header.playerIndex !== config.hostPlayerIndex
        ) {
          Object.assign(runtimeDebugStats, {
            rejected: runtimeDebugStats.rejected + 1,
          });
          updateRuntimeDebugStats(
            "reject",
            parsed.data,
            "Rejected non-host authoritative packet",
          );
          return err("Rejected non-host authoritative packet");
        }
      }

      const decoded = decodeMultiplayerPacket(parsed.data);
      if (
        !config.isHost &&
        decoded.isOk() &&
        isHostAuthoritativeMessageType(decoded.value.envelope.messageType) &&
        decoded.value.envelope.senderPlayerIndex !== config.hostPlayerIndex
      ) {
        Object.assign(runtimeDebugStats, {
          rejected: runtimeDebugStats.rejected + 1,
        });
        updateRuntimeDebugStats(
          "reject",
          parsed.data,
          "Rejected non-host authoritative packet",
        );
        return err("Rejected non-host authoritative packet");
      }
      return impairIncoming(parsed.data);
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
    getMatchIdLow: bridge.getMatchIdLow,
    getMatchIdHigh: bridge.getMatchIdHigh,
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
