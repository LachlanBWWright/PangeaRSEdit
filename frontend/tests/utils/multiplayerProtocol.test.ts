import { describe, expect, it } from "vitest";
import {
  decodeMultiplayerPacket,
  encodeMultiplayerPacket,
  type MultiplayerMessageType,
} from "@/multiplayer/protocol";

describe("multiplayer protocol envelope", () => {
  const allMessageTypes: MultiplayerMessageType[] = [
    "hello",
    "helloAck",
    "heartbeat",
    "loadReady",
    "startCountdown",
    "clientInput",
    "hostInputBundle",
    "resendRequest",
    "syncPause",
    "syncResume",
    "pauseRequest",
    "resumeRequest",
    "disconnectNotice",
    "desyncReport",
    "matchEnd",
    "clientInputCommand",
    "clientReady",
    "clientPing",
    "clientDesyncReport",
    "hostSnapshot",
    "hostCorrection",
    "hostEvent",
    "hostPause",
    "hostResume",
    "hostDisconnect",
  ];

  it("round-trips packet envelope and payload", () => {
    const encodeResult = encodeMultiplayerPacket({
      envelope: {
        protocolVersion: 1,
        gameId: 2,
        messageType: "hostInputBundle",
        flags: 0,
        matchSequence: 123,
        frameNumber: 456,
        senderPlayerIndex: 1,
      },
      payload: Uint8Array.from([9, 8, 7]).buffer,
    });

    expect(encodeResult.isOk()).toBe(true);
    if (encodeResult.isErr()) {
      return;
    }

    const decodeResult = decodeMultiplayerPacket(encodeResult.value);
    expect(decodeResult.isOk()).toBe(true);
    if (decodeResult.isErr()) {
      return;
    }

    expect(decodeResult.value.envelope.protocolVersion).toBe(1);
    expect(decodeResult.value.envelope.gameId).toBe(2);
    expect(decodeResult.value.envelope.messageType).toBe("hostInputBundle");
    expect(decodeResult.value.envelope.matchSequence).toBe(123);
    expect(decodeResult.value.envelope.frameNumber).toBe(456);
    expect(Array.from(new Uint8Array(decodeResult.value.payload))).toEqual([9, 8, 7]);
  });

  it("rejects malformed payload lengths", () => {
    const bytes = new ArrayBuffer(22);
    const view = new DataView(bytes);
    view.setUint16(0, 1);
    view.setUint16(2, 1);
    view.setUint16(4, 1);
    view.setUint16(6, 0);
    view.setUint32(8, 1);
    view.setUint32(12, 1);
    view.setUint16(16, 0);
    view.setUint16(18, 16);

    const result = decodeMultiplayerPacket(bytes);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("packet.bad-format");
    }
  });

  it("round-trips all supported message types", () => {
    for (const messageType of allMessageTypes) {
      const encodeResult = encodeMultiplayerPacket({
        envelope: {
          protocolVersion: 1,
          gameId: 2,
          messageType,
          flags: 7,
          matchSequence: 10,
          frameNumber: 20,
          senderPlayerIndex: 1,
        },
        payload: Uint8Array.from([5, 6]).buffer,
      });
      expect(encodeResult.isOk()).toBe(true);
      if (encodeResult.isErr()) {
        continue;
      }
      const decodeResult = decodeMultiplayerPacket(encodeResult.value);
      expect(decodeResult.isOk()).toBe(true);
      if (decodeResult.isErr()) {
        continue;
      }
      expect(decodeResult.value.envelope.messageType).toBe(messageType);
    }
  });

  it("rejects short headers", () => {
    const result = decodeMultiplayerPacket(new ArrayBuffer(19));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("packet.bad-format");
    }
  });

  it("rejects unknown message type", () => {
    const bytes = new ArrayBuffer(20);
    const view = new DataView(bytes);
    view.setUint16(0, 1);
    view.setUint16(2, 1);
    view.setUint16(4, 777);
    view.setUint16(6, 0);
    view.setUint32(8, 1);
    view.setUint32(12, 1);
    view.setUint16(16, 0);
    view.setUint16(18, 0);

    const result = decodeMultiplayerPacket(bytes);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("packet.unknown-message-type");
    }
  });

  it("rejects payloads larger than 65535 bytes", () => {
    const result = encodeMultiplayerPacket({
      envelope: {
        protocolVersion: 1,
        gameId: 2,
        messageType: "hello",
        flags: 0,
        matchSequence: 1,
        frameNumber: 2,
        senderPlayerIndex: 0,
      },
      payload: new ArrayBuffer(65536),
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("packet.bad-format");
    }
  });
});
