import { Result, err, ok } from "neverthrow";
import { decodeMultiplayerPacket } from "./protocol";
import type {
  MultiplayerRuntimeManagedTransport,
  MultiplayerRuntimeTransport,
} from "./runtimeBridge";
import type { WebRtcRuntimeTransportHandle } from "./webrtcRuntimeTransport";
import {
  PNET_PLAYER_NA,
  decodePnetHeader,
  isPnetClientPacketType,
  isPnetHostPacketType,
  isKnownPnetPacketType,
} from "./pnetPacket";

function isHostOnlyMessageType(messageType: string): boolean {
  return (
    messageType === "hostSnapshot" ||
    messageType === "hostCorrection" ||
    messageType === "hostEvent" ||
    messageType === "hostPause" ||
    messageType === "hostResume" ||
    messageType === "hostDisconnect" ||
    messageType === "hostInputBundle" ||
    messageType === "startCountdown"
  );
}

function isClientOnlyMessageType(messageType: string): boolean {
  return (
    messageType === "clientInput" ||
    messageType === "clientInputCommand" ||
    messageType === "clientReady" ||
    messageType === "clientPing" ||
    messageType === "clientDesyncReport" ||
    messageType === "pauseRequest" ||
    messageType === "resumeRequest"
  );
}

export interface HostRuntimeTransportMultiplexer {
  readonly transport: MultiplayerRuntimeManagedTransport;
  readonly attachPeer: (
    participantId: string,
    transportHandle: WebRtcRuntimeTransportHandle,
  ) => void;
  readonly detachPeer: (participantId: string) => void;
  readonly dispose: () => void;
}

export function createHostRuntimeTransportMultiplexer(input: {
  readonly getExpectedPlayerIndexForParticipant: (
    participantId: string,
  ) => number | null;
  readonly getExpectedMatchIdentity: () => {
    readonly matchIdLow: number;
    readonly matchIdHigh: number;
  } | null;
  readonly reportDesync: MultiplayerRuntimeTransport["reportDesync"];
  readonly reportMatchEnded: MultiplayerRuntimeTransport["reportMatchEnded"];
}): HostRuntimeTransportMultiplexer {
  const peers = new Map<string, WebRtcRuntimeTransportHandle>();
  const unsubscribers = new Map<string, () => void>();
  const listeners = new Set<(bytes: ArrayBuffer) => void>();

  const forwardIncoming = (participantId: string, bytes: ArrayBuffer): void => {
    const expectedPlayerIndex =
      input.getExpectedPlayerIndexForParticipant(participantId);
    if (expectedPlayerIndex === null) {
      return;
    }

    const decodedPnet = decodePnetHeader(bytes);
    if (decodedPnet.isOk()) {
      const expectedMatchIdentity = input.getExpectedMatchIdentity();
      if (!expectedMatchIdentity) {
        return;
      }
      const header = decodedPnet.value;
      if (
        header.matchIdLow !== expectedMatchIdentity.matchIdLow ||
        header.matchIdHigh !== expectedMatchIdentity.matchIdHigh
      ) {
        return;
      }
      if (!isKnownPnetPacketType(header.packetType)) {
        return;
      }
      if (isPnetHostPacketType(header.packetType)) {
        return;
      }
      if (
        isPnetClientPacketType(header.packetType) &&
        header.playerIndex !== expectedPlayerIndex
      ) {
        return;
      }
      for (const listener of listeners) {
        listener(bytes);
      }
      return;
    }

    const decoded = decodeMultiplayerPacket(bytes);
    if (decoded.isErr()) {
      return;
    }
    const envelope = decoded.value.envelope;
    if (isHostOnlyMessageType(envelope.messageType)) {
      return;
    }
    if (
      isClientOnlyMessageType(envelope.messageType) &&
      envelope.senderPlayerIndex !== expectedPlayerIndex
    ) {
      return;
    }

    for (const listener of listeners) {
      listener(bytes);
    }
  };

  const sendToPeers = (
    sender: (transport: MultiplayerRuntimeTransport) => Result<void, string>,
  ): Result<void, string> => {
    if (peers.size === 0) {
      return err("No connected runtime peers");
    }

    let delivered = false;
    let firstFailure: string | null = null;
    for (const handle of peers.values()) {
      const sent = sender(handle.transport);
      if (sent.isOk()) {
        delivered = true;
        continue;
      }
      if (firstFailure === null) {
        firstFailure = sent.error;
      }
    }

    if (delivered) {
      return ok(undefined);
    }
    return err(firstFailure ?? "Failed to send packet to peers");
  };

  const detachPeer = (participantId: string): void => {
    const unsubscribe = unsubscribers.get(participantId);
    if (unsubscribe) {
      unsubscribe();
      unsubscribers.delete(participantId);
    }
    const peer = peers.get(participantId);
    if (peer) {
      peer.dispose();
      peers.delete(participantId);
    }
  };

  return {
    transport: {
      sendReliable: (bytes) =>
        sendToPeers((transport) => transport.sendReliable(bytes)),
      sendUnreliable: (bytes) =>
        sendToPeers((transport) => transport.sendUnreliable(bytes)),
      reportDesync: input.reportDesync,
      reportMatchEnded: input.reportMatchEnded,
      subscribeIncoming: (onPacket) => {
        listeners.add(onPacket);
        return () => {
          listeners.delete(onPacket);
        };
      },
    },
    attachPeer: (participantId, transportHandle) => {
      detachPeer(participantId);
      peers.set(participantId, transportHandle);
      const unsubscribe = transportHandle.transport.subscribeIncoming((bytes) => {
        forwardIncoming(participantId, bytes);
      });
      unsubscribers.set(participantId, unsubscribe);
    },
    detachPeer,
    dispose: () => {
      const participantIds = Array.from(peers.keys());
      for (const participantId of participantIds) {
        detachPeer(participantId);
      }
      listeners.clear();
    },
  };
}

export function createClientRuntimeTransportGuard(input: {
  readonly transport: MultiplayerRuntimeManagedTransport;
  readonly expectedHostPlayerIndex: number;
  readonly expectedMatchIdentity: () => {
    readonly matchIdLow: number;
    readonly matchIdHigh: number;
  } | null;
}): MultiplayerRuntimeManagedTransport {
  return {
    ...input.transport,
    subscribeIncoming: (onPacket) => {
      const unsubscribe = input.transport.subscribeIncoming((bytes) => {
        const decodedPnet = decodePnetHeader(bytes);
        if (decodedPnet.isOk()) {
          const expectedMatchIdentity = input.expectedMatchIdentity();
          if (!expectedMatchIdentity) {
            return;
          }
          const header = decodedPnet.value;
          if (
            header.matchIdLow !== expectedMatchIdentity.matchIdLow ||
            header.matchIdHigh !== expectedMatchIdentity.matchIdHigh
          ) {
            return;
          }
          if (!isKnownPnetPacketType(header.packetType)) {
            return;
          }
          if (isPnetClientPacketType(header.packetType)) {
            return;
          }
          if (isPnetHostPacketType(header.packetType)) {
            const fromHost =
              header.playerIndex === PNET_PLAYER_NA ||
              header.playerIndex === input.expectedHostPlayerIndex;
            if (!fromHost) {
              return;
            }
          }
          onPacket(bytes);
          return;
        }
        onPacket(bytes);
      });
      return unsubscribe;
    },
  };
}
