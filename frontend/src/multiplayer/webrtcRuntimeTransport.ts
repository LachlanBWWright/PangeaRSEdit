import { Result, err, ok } from "neverthrow";
import type { MultiplayerRuntimeManagedTransport } from "./runtimeBridge";
import {
  GameplaySequenceTracker,
  DisruptionDetector,
} from "./sequenceTracking";
import {
  decodeMultiplayerPacket,
} from "./protocol";

interface DataChannelMessageEvent {
  readonly data: unknown;
}

interface RuntimeDataChannel {
  readonly readyState: string;
  readonly bufferedAmount?: number;
  onopen?: (() => void) | null;
  onclose?: (() => void) | null;
  send(data: ArrayBuffer): void;
  addEventListener(
    type: "message",
    listener: (event: DataChannelMessageEvent) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: DataChannelMessageEvent) => void,
  ): void;
}

export type RuntimeSyncDisruptionReason =
  | "missing-packet"
  | "heartbeat-timeout"
  | "resync-required"
  | "channel-closed";

export interface RuntimePacketGapEvent {
  readonly type: "packet-gap";
  readonly expectedSequence: number;
  readonly receivedSequence: number;
}

export interface RuntimePacketDuplicateEvent {
  readonly type: "packet-duplicate";
  readonly sequence: number;
}

export interface RuntimeResendRequestedEvent {
  readonly type: "resend-requested";
  readonly fromSequence: number;
  readonly toSequence: number;
}

export interface RuntimeResendReplayedEvent {
  readonly type: "resend-replayed";
  readonly fromSequence: number;
  readonly toSequence: number;
  readonly sentCount: number;
}

export interface RuntimeHeartbeatTimeoutEvent {
  readonly type: "heartbeat-timeout";
  readonly elapsedMilliseconds: number;
}

export interface RuntimeSyncPausedEvent {
  readonly type: "sync-paused";
  readonly reason: RuntimeSyncDisruptionReason;
}

export interface RuntimeSyncResumedEvent {
  readonly type: "sync-resumed";
  readonly reason: RuntimeSyncDisruptionReason;
}

export interface RuntimePeerDisconnectedEvent {
  readonly type: "peer-disconnected";
}

export type WebRtcRuntimeDisruptionEvent =
  | RuntimePacketGapEvent
  | RuntimePacketDuplicateEvent
  | RuntimeResendRequestedEvent
  | RuntimeResendReplayedEvent
  | RuntimeHeartbeatTimeoutEvent
  | RuntimeSyncPausedEvent
  | RuntimeSyncResumedEvent
  | RuntimePeerDisconnectedEvent;

export interface WebRtcRuntimeTransportOptions {
  readonly reliableChannel: RuntimeDataChannel;
  readonly unreliableChannel?: RuntimeDataChannel;
  readonly reportDesync?: (
    frame: number,
    localHash: number,
    remoteHash: number,
  ) => void;
  readonly reportMatchEnded?: (reason: number) => void;
  readonly isHostAuthority?: boolean;
  readonly heartbeatIntervalMs?: number;
  readonly heartbeatTimeoutMs?: number;
  readonly nowMilliseconds?: () => number;
  readonly onDisruptionEvent?: (event: WebRtcRuntimeDisruptionEvent) => void;
}

export interface WebRtcRuntimeTransportHandle {
  readonly transport: MultiplayerRuntimeManagedTransport;
  readonly dispose: () => void;
}

const TRANSPORT_MAGIC = 0x504e4554;
const TRANSPORT_VERSION = 1;
const TRANSPORT_HEADER_SIZE = 20;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 1_000;
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 6_000;
const STATE_CHANNEL_SOFT_BUFFER_LIMIT_BYTES = 128_000;
const STATE_CHANNEL_HARD_BUFFER_LIMIT_BYTES = 512_000;

type TransportPacketKind =
  | "heartbeat"
  | "resendRequest"
  | "syncPause"
  | "syncResume"
  | "disconnectNotice";

interface ParsedTransportPacket {
  readonly kind: TransportPacketKind;
  readonly payload: ArrayBuffer;
}

function cloneBuffer(bytes: ArrayBuffer): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(new Uint8Array(bytes));
  return copy;
}

function packetKindToByte(kind: TransportPacketKind): number {
  if (kind === "heartbeat") {
    return 1;
  }
  if (kind === "resendRequest") {
    return 2;
  }
  if (kind === "syncPause") {
    return 3;
  }
  if (kind === "syncResume") {
    return 4;
  }
  return 5;
}

function byteToPacketKind(
  kindByte: number,
): Result<TransportPacketKind, string> {
  if (kindByte === 1) {
    return ok("heartbeat");
  }
  if (kindByte === 2) {
    return ok("resendRequest");
  }
  if (kindByte === 3) {
    return ok("syncPause");
  }
  if (kindByte === 4) {
    return ok("syncResume");
  }
  if (kindByte === 5) {
    return ok("disconnectNotice");
  }
  return err("Unknown transport packet kind");
}

function encodeControlPacket(
  kind: TransportPacketKind,
  sequence: number,
): ArrayBuffer {
  const bytes = new ArrayBuffer(TRANSPORT_HEADER_SIZE);
  const view = new DataView(bytes);
  view.setUint32(0, TRANSPORT_MAGIC);
  view.setUint16(4, TRANSPORT_VERSION);
  view.setUint8(6, packetKindToByte(kind));
  view.setUint8(7, 0);
  view.setUint32(8, sequence);
  view.setUint32(12, 0);
  view.setUint16(16, 0);
  view.setUint16(18, 0);
  return bytes;
}

function decodeTransportPacket(
  bytes: ArrayBuffer,
): Result<ParsedTransportPacket, "transport.not-wrapped" | string> {
  if (bytes.byteLength < TRANSPORT_HEADER_SIZE) {
    return err("transport.not-wrapped");
  }

  const view = new DataView(bytes);
  if (view.getUint32(0) !== TRANSPORT_MAGIC) {
    return err("transport.not-wrapped");
  }
  if (view.getUint16(4) !== TRANSPORT_VERSION) {
    return err("Unsupported transport packet version");
  }
  const kindResult = byteToPacketKind(view.getUint8(6));
  if (kindResult.isErr()) {
    return err(kindResult.error);
  }
  const payloadLength = view.getUint16(18);
  const expectedLength = TRANSPORT_HEADER_SIZE + payloadLength;
  if (bytes.byteLength !== expectedLength) {
    return err("Transport packet length mismatch");
  }

  return ok({
    kind: kindResult.value,
    payload: bytes.slice(TRANSPORT_HEADER_SIZE),
  });
}

function normalizeIncomingBytes(data: unknown): Result<ArrayBuffer, string> {
  if (data instanceof ArrayBuffer) {
    return ok(cloneBuffer(data));
  }

  if (data instanceof Uint8Array) {
    const copied = new Uint8Array(data.byteLength);
    copied.set(data);
    return ok(copied.buffer);
  }

  return err("Unsupported RTC data payload type");
}

function sendOnChannel(
  channel: RuntimeDataChannel,
  bytes: ArrayBuffer,
): Result<void, string> {
  if (channel.readyState !== "open") {
    return err("RTC data channel is not open");
  }

  const sendResult = Result.fromThrowable(
    () => channel.send(bytes),
    () => "Failed to send RTC packet",
  )();

  if (sendResult.isErr()) {
    return err(sendResult.error);
  }

  return ok(undefined);
}

function isHighFrequencyStatePacket(bytes: ArrayBuffer): boolean {
  const decoded = decodeMultiplayerPacket(bytes);
  if (decoded.isErr()) {
    return false;
  }
  const messageType = decoded.value.envelope.messageType;
  return (
    messageType === "hostSnapshot" ||
    messageType === "hostCorrection" ||
    messageType === "hostInputBundle" ||
    messageType === "clientInput" ||
    messageType === "clientInputCommand"
  );
}

export function createWebRtcRuntimeTransport(
  options: WebRtcRuntimeTransportOptions,
): WebRtcRuntimeTransportHandle {
  const {
    reliableChannel,
    unreliableChannel,
    reportDesync,
    reportMatchEnded,
    isHostAuthority = false,
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
    heartbeatTimeoutMs = DEFAULT_HEARTBEAT_TIMEOUT_MS,
    nowMilliseconds,
    onDisruptionEvent,
  } = options;

  const listeners = new Set<(bytes: ArrayBuffer) => void>();
  const clock =
    nowMilliseconds ??
    (() =>
      typeof performance === "undefined" ? Date.now() : performance.now());
  let lastReceivedAt = clock();
  let lastSentAt = clock();
  let timeoutActive = false;
  let syncPaused = false;
  let controlSequence = 1;
  const gameplaySequenceTracker = new GameplaySequenceTracker(isHostAuthority);
  const disruptionDetector = new DisruptionDetector(heartbeatTimeoutMs);

  function emitDisruption(event: WebRtcRuntimeDisruptionEvent): void {
    onDisruptionEvent?.(event);
  }

  function markSyncPaused(reason: RuntimeSyncDisruptionReason): void {
    if (syncPaused) {
      return;
    }
    syncPaused = true;
    emitDisruption({
      type: "sync-paused",
      reason,
    });
  }

  function markSyncResumed(reason: RuntimeSyncDisruptionReason): void {
    if (!syncPaused) {
      return;
    }
    syncPaused = false;
    emitDisruption({
      type: "sync-resumed",
      reason,
    });
  }

  function sendControlPacket(kind: TransportPacketKind): Result<void, string> {
    const bytes = encodeControlPacket(kind, controlSequence);
    controlSequence += 1;
    const result = sendOnChannel(reliableChannel, bytes);
    if (result.isErr()) {
      return err(result.error);
    }
    lastSentAt = clock();
    return ok(undefined);
  }

  const onMessage = (event: DataChannelMessageEvent): void => {
    const parsed = normalizeIncomingBytes(event.data);
    if (parsed.isErr()) {
      return;
    }
    lastReceivedAt = clock();

    if (timeoutActive) {
      timeoutActive = false;
      markSyncResumed("heartbeat-timeout");
      void sendControlPacket("syncResume");
    }

    const decoded = decodeTransportPacket(parsed.value);
    if (decoded.isErr()) {
      if (decoded.error === "transport.not-wrapped") {
        // Try to decode as gameplay packet for sequence validation
        const gameplayDecoded = decodeMultiplayerPacket(parsed.value);
        if (gameplayDecoded.isOk()) {
          const envelope = gameplayDecoded.value.envelope;
          const validationResult = gameplaySequenceTracker.validate(envelope);

          if (!validationResult.isValid) {
            if (validationResult.isDuplicate) {
              emitDisruption({
                type: "packet-duplicate",
                sequence: envelope.matchSequence,
              });
            }
            return;
          }

          if (validationResult.isGap) {
            emitDisruption({
              type: "packet-gap",
              expectedSequence: validationResult.expectedSequence ?? 0,
              receivedSequence: envelope.matchSequence,
            });
          }

          // Reset disruption detector on valid packet
          disruptionDetector.recordPacket();

          // Pass to listeners
          for (const listener of listeners) {
            listener(parsed.value);
          }
        } else {
          // Non-gameplay packet, pass through
          for (const listener of listeners) {
            listener(parsed.value);
          }
        }
      }
      return;
    }

    const packet = decoded.value;
    if (packet.kind === "heartbeat") {
      return;
    }
    if (packet.kind === "disconnectNotice") {
      emitDisruption({ type: "peer-disconnected" });
      markSyncPaused("channel-closed");
      return;
    }
    if (packet.kind === "syncPause") {
      markSyncPaused("resync-required");
      return;
    }
    if (packet.kind === "syncResume") {
      markSyncResumed("resync-required");
      return;
    }
    if (packet.kind === "resendRequest" && isHostAuthority) {
      markSyncPaused("resync-required");
      void sendControlPacket("syncPause");
    }
  };

  const onOpen = (): void => {
    timeoutActive = false;
    lastReceivedAt = clock();
    markSyncResumed("channel-closed");
  };

  const onClose = (): void => {
    emitDisruption({ type: "peer-disconnected" });
    markSyncPaused("channel-closed");
  };

  const previousReliableOnOpen = reliableChannel.onopen ?? null;
  const previousReliableOnClose = reliableChannel.onclose ?? null;
  reliableChannel.onopen = () => {
    previousReliableOnOpen?.();
    onOpen();
  };
  reliableChannel.onclose = () => {
    previousReliableOnClose?.();
    onClose();
  };
  reliableChannel.addEventListener("message", onMessage);

  let previousUnreliableOnOpen: (() => void) | null = null;
  let previousUnreliableOnClose: (() => void) | null = null;
  if (unreliableChannel) {
    previousUnreliableOnOpen = unreliableChannel.onopen ?? null;
    previousUnreliableOnClose = unreliableChannel.onclose ?? null;
    unreliableChannel.onopen = () => {
      previousUnreliableOnOpen?.();
      onOpen();
    };
    unreliableChannel.onclose = () => {
      previousUnreliableOnClose?.();
      onClose();
    };
    unreliableChannel.addEventListener("message", onMessage);
  }

  const heartbeatIntervalId = window.setInterval(
    () => {
      const now = clock();
      const elapsed = now - lastReceivedAt;

      if (elapsed > heartbeatTimeoutMs) {
        if (!timeoutActive) {
          timeoutActive = true;
          disruptionDetector.recordMissing();
          emitDisruption({
            type: "heartbeat-timeout",
            elapsedMilliseconds: elapsed,
          });
          markSyncPaused("heartbeat-timeout");
          void sendControlPacket("syncPause");
        }
      }

      if (now - lastSentAt >= heartbeatIntervalMs) {
        void sendControlPacket("heartbeat");
      }
    },
    Math.max(100, Math.min(heartbeatIntervalMs, 5_000)),
  );

  const transport: MultiplayerRuntimeManagedTransport = {
    sendReliable: (bytes) => sendOnChannel(reliableChannel, bytes),
    sendUnreliable: (bytes) => {
      if (!unreliableChannel) {
        return err("State data channel is not available");
      }
      const bufferedAmount = unreliableChannel.bufferedAmount ?? 0;
      if (
        bufferedAmount >= STATE_CHANNEL_SOFT_BUFFER_LIMIT_BYTES &&
        isHighFrequencyStatePacket(bytes)
      ) {
        return ok(undefined);
      }
      if (bufferedAmount >= STATE_CHANNEL_HARD_BUFFER_LIMIT_BYTES) {
        return err("State data channel is congested");
      }
      return sendOnChannel(unreliableChannel, bytes);
    },
    reportDesync: (frame, localHash, remoteHash) => {
      reportDesync?.(frame, localHash, remoteHash);
    },
    reportMatchEnded: (reason) => {
      reportMatchEnded?.(reason);
    },
    subscribeIncoming: (onPacket) => {
      listeners.add(onPacket);
      return () => {
        listeners.delete(onPacket);
      };
    },
  };

  return {
    transport,
    dispose: () => {
      window.clearInterval(heartbeatIntervalId);
      void sendControlPacket("disconnectNotice");
      listeners.clear();
      reliableChannel.removeEventListener("message", onMessage);
      reliableChannel.onopen = previousReliableOnOpen;
      reliableChannel.onclose = previousReliableOnClose;
      if (unreliableChannel) {
        unreliableChannel.removeEventListener("message", onMessage);
        unreliableChannel.onopen = previousUnreliableOnOpen;
        unreliableChannel.onclose = previousUnreliableOnClose;
      }
    },
  };
}
