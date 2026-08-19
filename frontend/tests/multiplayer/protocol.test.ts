import { describe, it, expect } from "vitest";
import {
  encodeMultiplayerPacket,
  decodeMultiplayerPacket,
} from "@/multiplayer/protocol";
import type { MultiplayerPacket } from "@/multiplayer/protocol";

describe("Multiplayer Protocol - Reliability Field", () => {
  it("encodes strict reliability correctly", () => {
    const packet: MultiplayerPacket = {
      envelope: {
        protocolVersion: 1,
        gameId: 1,
        messageType: "hostInputBundle",
        flags: 0,
        matchSequence: 100,
        frameNumber: 50,
        senderPlayerIndex: 0,
        reliability: "strict",
      },
      payload: new ArrayBuffer(0),
    };

    const encoded = encodeMultiplayerPacket(packet);
    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) {
      return;
    }

    const view = new DataView(encoded.value);
    const flags = view.getUint16(6);
    expect((flags & (1 << 15)) !== 0).toBe(true); // Strict bit should be set
  });

  it("encodes ordered reliability correctly", () => {
    const packet: MultiplayerPacket = {
      envelope: {
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 100,
        frameNumber: 50,
        senderPlayerIndex: 1,
        reliability: "ordered",
      },
      payload: new ArrayBuffer(0),
    };

    const encoded = encodeMultiplayerPacket(packet);
    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) {
      return;
    }

    const view = new DataView(encoded.value);
    const flags = view.getUint16(6);
    expect((flags & (1 << 15)) !== 0).toBe(false); // Strict bit should not be set
  });

  it("round-trips strict reliability", () => {
    const packet: MultiplayerPacket = {
      envelope: {
        protocolVersion: 1,
        gameId: 5,
        messageType: "matchEnd",
        flags: 0,
        matchSequence: 12345,
        frameNumber: 999,
        senderPlayerIndex: 0,
        reliability: "strict",
      },
      payload: new ArrayBuffer(16),
    };

    const encoded = encodeMultiplayerPacket(packet);
    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) {
      return;
    }

    const decoded = decodeMultiplayerPacket(encoded.value);
    expect(decoded.isOk()).toBe(true);
    if (decoded.isErr()) {
      return;
    }

    const decodedPacket = decoded.value;
    expect(decodedPacket.envelope.reliability).toBe("strict");
    expect(decodedPacket.envelope.messageType).toBe("matchEnd");
    expect(decodedPacket.envelope.matchSequence).toBe(12345);
  });

  it("round-trips ordered reliability", () => {
    const packet: MultiplayerPacket = {
      envelope: {
        protocolVersion: 1,
        gameId: 2,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 54321,
        frameNumber: 111,
        senderPlayerIndex: 2,
        reliability: "ordered",
      },
      payload: new ArrayBuffer(32),
    };

    const encoded = encodeMultiplayerPacket(packet);
    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) {
      return;
    }

    const decoded = decodeMultiplayerPacket(encoded.value);
    expect(decoded.isOk()).toBe(true);
    if (decoded.isErr()) {
      return;
    }

    const decodedPacket = decoded.value;
    expect(decodedPacket.envelope.reliability).toBe("ordered");
    expect(decodedPacket.envelope.messageType).toBe("clientInput");
    expect(decodedPacket.envelope.matchSequence).toBe(54321);
  });

  it("preserves payload integrity", () => {
    const testPayload = new Uint8Array([1, 2, 3, 4, 5]);
    const packet: MultiplayerPacket = {
      envelope: {
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "ordered",
      },
      payload: testPayload.buffer,
    };

    const encoded = encodeMultiplayerPacket(packet);
    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) {
      return;
    }

    const decoded = decodeMultiplayerPacket(encoded.value);
    expect(decoded.isOk()).toBe(true);
    if (decoded.isErr()) {
      return;
    }

    const decodedPayload = new Uint8Array(decoded.value.payload);
    expect(decodedPayload).toEqual(testPayload);
  });
});
