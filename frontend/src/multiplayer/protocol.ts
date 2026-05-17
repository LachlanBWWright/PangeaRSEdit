import { Result, err, ok } from "neverthrow";

export type MultiplayerMessageType =
  | "hello"
  | "helloAck"
  | "heartbeat"
  | "loadReady"
  | "startCountdown"
  | "clientInput"
  | "hostInputBundle"
  | "resendRequest"
  | "syncPause"
  | "syncResume"
  | "pauseRequest"
  | "resumeRequest"
  | "disconnectNotice"
  | "desyncReport"
  | "matchEnd"
  | "clientInputCommand"
  | "clientReady"
  | "clientPing"
  | "clientDesyncReport"
  | "hostSnapshot"
  | "hostCorrection"
  | "hostEvent"
  | "hostPause"
  | "hostResume"
  | "hostDisconnect";

export interface MultiplayerPacketEnvelope {
  readonly protocolVersion: number;
  readonly gameId: number;
  readonly messageType: MultiplayerMessageType;
  readonly flags: number;
  readonly matchSequence: number;
  readonly frameNumber: number;
  readonly senderPlayerIndex: number;
  readonly reliability: "strict" | "ordered"; // strict = host authority, ordered = duplicate rejection only
}

export interface MultiplayerPacket {
  readonly envelope: MultiplayerPacketEnvelope;
  readonly payload: ArrayBuffer;
}

export interface MultiplayerProtocolError {
  readonly code: "packet.bad-format" | "packet.unknown-message-type";
  readonly message: string;
}

const HEADER_SIZE = 24;

const messageTypeToId: Record<MultiplayerMessageType, number> = {
  hello: 1,
  helloAck: 2,
  heartbeat: 3,
  loadReady: 4,
  startCountdown: 5,
  clientInput: 6,
  hostInputBundle: 7,
  resendRequest: 8,
  syncPause: 9,
  syncResume: 10,
  pauseRequest: 11,
  resumeRequest: 12,
  disconnectNotice: 13,
  desyncReport: 14,
  matchEnd: 15,
  clientInputCommand: 16,
  clientReady: 17,
  clientPing: 18,
  clientDesyncReport: 19,
  hostSnapshot: 20,
  hostCorrection: 21,
  hostEvent: 22,
  hostPause: 23,
  hostResume: 24,
  hostDisconnect: 25,
};

function mapMessageTypeIdToName(
  messageTypeId: number,
): Result<MultiplayerMessageType, MultiplayerProtocolError> {
  const entry = Object.entries(messageTypeToId).find(
    ([, id]) => id === messageTypeId,
  );
  if (!entry) {
    return err({
      code: "packet.unknown-message-type",
      message: `Unknown multiplayer message type id: ${String(messageTypeId)}`,
    });
  }

  const [name] = entry;
  if (
    name === "hello" ||
    name === "helloAck" ||
    name === "heartbeat" ||
    name === "loadReady" ||
    name === "startCountdown" ||
    name === "clientInput" ||
    name === "hostInputBundle" ||
    name === "resendRequest" ||
    name === "syncPause" ||
    name === "syncResume" ||
    name === "pauseRequest" ||
    name === "resumeRequest" ||
    name === "disconnectNotice" ||
    name === "desyncReport" ||
    name === "matchEnd" ||
    name === "clientInputCommand" ||
    name === "clientReady" ||
    name === "clientPing" ||
    name === "clientDesyncReport" ||
    name === "hostSnapshot" ||
    name === "hostCorrection" ||
    name === "hostEvent" ||
    name === "hostPause" ||
    name === "hostResume" ||
    name === "hostDisconnect"
  ) {
    return ok(name);
  }

  return err({
    code: "packet.unknown-message-type",
    message: `Unknown multiplayer message type id: ${String(messageTypeId)}`,
  });
}

export function encodeMultiplayerPacket(
  packet: MultiplayerPacket,
): Result<ArrayBuffer, MultiplayerProtocolError> {
  const messageTypeId = messageTypeToId[packet.envelope.messageType];
  if (!messageTypeId) {
    return err({
      code: "packet.unknown-message-type",
      message: `Unsupported message type: ${packet.envelope.messageType}`,
    });
  }

  if (packet.payload.byteLength > 0xffff) {
    return err({
      code: "packet.bad-format",
      message: "Payload exceeds 65535 bytes",
    });
  }

  const bytes = new ArrayBuffer(HEADER_SIZE + packet.payload.byteLength);
  const view = new DataView(bytes);
  view.setUint16(0, packet.envelope.protocolVersion);
  view.setUint16(2, packet.envelope.gameId);
  view.setUint16(4, messageTypeId);
  const reliabilityByte = packet.envelope.reliability === "strict" ? 1 : 0;
  view.setUint16(6, packet.envelope.flags | (reliabilityByte << 15));
  view.setUint32(8, packet.envelope.matchSequence);
  view.setUint32(12, packet.envelope.frameNumber);
  view.setUint16(16, packet.envelope.senderPlayerIndex);
  view.setUint16(18, packet.payload.byteLength);
  view.setUint8(20, 0); // reserved
  view.setUint8(21, 0); // reserved
  view.setUint16(22, 0); // reserved

  new Uint8Array(bytes, HEADER_SIZE).set(new Uint8Array(packet.payload));
  return ok(bytes);
}

export function decodeMultiplayerPacket(
  bytes: ArrayBuffer,
): Result<MultiplayerPacket, MultiplayerProtocolError> {
  if (bytes.byteLength < HEADER_SIZE) {
    return err({
      code: "packet.bad-format",
      message: `Expected at least ${String(HEADER_SIZE)} bytes, received ${String(bytes.byteLength)}`,
    });
  }

  const view = new DataView(bytes);
  const declaredPayloadBytes = view.getUint16(18);
  const expectedSize = HEADER_SIZE + declaredPayloadBytes;
  if (bytes.byteLength !== expectedSize) {
    return err({
      code: "packet.bad-format",
      message: `Packet payload length mismatch: expected ${String(expectedSize)}, received ${String(bytes.byteLength)}`,
    });
  }

  const messageTypeResult = mapMessageTypeIdToName(view.getUint16(4));
  if (messageTypeResult.isErr()) {
    return err(messageTypeResult.error);
  }

  const flagsAndReliability = view.getUint16(6);
  const reliability =
    (flagsAndReliability & (1 << 15)) !== 0 ? "strict" : "ordered";
  const flags = flagsAndReliability & 0x7fff;

  return ok({
    envelope: {
      protocolVersion: view.getUint16(0),
      gameId: view.getUint16(2),
      messageType: messageTypeResult.value,
      flags,
      matchSequence: view.getUint32(8),
      frameNumber: view.getUint32(12),
      senderPlayerIndex: view.getUint16(16),
      reliability,
    },
    payload: bytes.slice(HEADER_SIZE),
  });
}
