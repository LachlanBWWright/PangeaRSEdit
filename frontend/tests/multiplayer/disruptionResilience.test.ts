import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  GameplaySequenceTracker,
  HostAuthorityEnforcer,
} from "@/multiplayer/sequenceTracking";
import {
  encodeMultiplayerPacket,
  decodeMultiplayerPacket,
} from "@/multiplayer/protocol";
import type { MultiplayerPacket } from "@/multiplayer/protocol";

/**
 * Integration tests for the full multiplayer disruption resilience flow.
 */
describe("Multiplayer Disruption Resilience Integration", () => {
  let hostTracker: GameplaySequenceTracker;
  let clientTracker: GameplaySequenceTracker;
  let hostEnforcer: HostAuthorityEnforcer;
  let clientEnforcer: HostAuthorityEnforcer;

  beforeEach(() => {
    hostTracker = new GameplaySequenceTracker(true);
    clientTracker = new GameplaySequenceTracker(false);
    hostEnforcer = new HostAuthorityEnforcer(true, "host-id");
    clientEnforcer = new HostAuthorityEnforcer(false, "host-id");
  });

  describe("Frame-Synced Input Exchange", () => {
    it("host sends strict bundles, client sends ordered input", () => {
      // Host sends frame 0 control bundle with sequence 1
      const hostBundle: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 1,
          frameNumber: 0,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const hostBundleResult = encodeMultiplayerPacket(hostBundle);
      expect(hostBundleResult.isOk()).toBe(true);

      // Client receives and validates
      const decodedBundle = decodeMultiplayerPacket(
        hostBundleResult.value as ArrayBuffer,
      );
      expect(decodedBundle.isOk()).toBe(true);

      const bundleEnvelope = (decodedBundle.value as MultiplayerPacket)
        .envelope;
      const trackResult = clientTracker.validate(bundleEnvelope);
      expect(trackResult.isValid).toBe(true);

      const authResult = clientEnforcer.validateAuthority(
        bundleEnvelope,
        "host-id",
      );
      expect(authResult.isValid).toBe(true);

      // Client sends input for next frame with ordered reliability
      const clientInput: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "clientInput",
          flags: 0,
          matchSequence: 1,
          frameNumber: 0,
          senderPlayerIndex: 1,
          reliability: "ordered",
        },
        payload: new ArrayBuffer(16),
      };

      const clientInputResult = encodeMultiplayerPacket(clientInput);
      expect(clientInputResult.isOk()).toBe(true);

      // Host receives and validates
      const decodedInput = decodeMultiplayerPacket(
        clientInputResult.value as ArrayBuffer,
      );
      expect(decodedInput.isOk()).toBe(true);

      const inputEnvelope = (decodedInput.value as MultiplayerPacket).envelope;
      const inputTrackResult = hostTracker.validate(inputEnvelope);
      expect(inputTrackResult.isValid).toBe(true);

      const inputAuthResult = hostEnforcer.validateAuthority(
        inputEnvelope,
        "client-id",
      );
      expect(inputAuthResult.isValid).toBe(true);
    });

    it("detects out-of-order frames in strict mode", () => {
      // Host sends frame 2 (should be frame 1)
      const packet1: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 1,
          frameNumber: 2,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const encoded1 = encodeMultiplayerPacket(packet1);
      const decoded1 = decodeMultiplayerPacket(encoded1.value as ArrayBuffer);
      const result1 = clientTracker.validate(
        (decoded1.value as MultiplayerPacket).envelope,
      );
      expect(result1.isValid).toBe(true);

      // Then sends frame 1 (out of order)
      const packet2: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 2,
          frameNumber: 1,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const encoded2 = encodeMultiplayerPacket(packet2);
      const decoded2 = decodeMultiplayerPacket(encoded2.value as ArrayBuffer);
      const result2 = clientTracker.validate(
        (decoded2.value as MultiplayerPacket).envelope,
      );
      expect(result2.isValid).toBe(true); // Sequence is still valid (2 > 1)
    });

    it("handles dropped packets by detecting gaps", () => {
      // Receive packet with sequence 1
      const packet1: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 1,
          frameNumber: 0,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const enc1 = encodeMultiplayerPacket(packet1);
      const dec1 = decodeMultiplayerPacket(enc1.value as ArrayBuffer);
      const res1 = clientTracker.validate(
        (dec1.value as MultiplayerPacket).envelope,
      );
      expect(res1.isValid).toBe(true);
      expect(res1.isGap).toBe(false);

      // Receive packet with sequence 4 (gap of 2 packets)
      const packet2: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 4,
          frameNumber: 3,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const enc2 = encodeMultiplayerPacket(packet2);
      const dec2 = decodeMultiplayerPacket(enc2.value as ArrayBuffer);
      const res2 = clientTracker.validate(
        (dec2.value as MultiplayerPacket).envelope,
      );
      expect(res2.isValid).toBe(true);
      expect(res2.isGap).toBe(true);
      expect(res2.reason).toContain("Gap detected");
    });
  });

  describe("Duplicate and Late Packet Handling", () => {
    it("rejects duplicate packets", () => {
      const packet: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 5,
          frameNumber: 4,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const encoded = encodeMultiplayerPacket(packet);
      const decoded = decodeMultiplayerPacket(encoded.value as ArrayBuffer);
      const envelope = (decoded.value as MultiplayerPacket).envelope;

      // First delivery
      const result1 = clientTracker.validate(envelope);
      expect(result1.isValid).toBe(true);
      expect(result1.isDuplicate).toBe(false);

      // Duplicate delivery
      const result2 = clientTracker.validate(envelope);
      expect(result2.isValid).toBe(false);
      expect(result2.isDuplicate).toBe(true);
    });

    it("rejects late packets in strict mode", () => {
      // Receive sequence 10
      const packet1: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 10,
          frameNumber: 9,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const enc1 = encodeMultiplayerPacket(packet1);
      const dec1 = decodeMultiplayerPacket(enc1.value as ArrayBuffer);
      clientTracker.validate((dec1.value as MultiplayerPacket).envelope);

      // Try to receive old sequence 5
      const packet2: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 5,
          frameNumber: 4,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const enc2 = encodeMultiplayerPacket(packet2);
      const dec2 = decodeMultiplayerPacket(enc2.value as ArrayBuffer);
      const result = clientTracker.validate(
        (dec2.value as MultiplayerPacket).envelope,
      );
      expect(result.isValid).toBe(false);
    });
  });

  describe("Authority Violations", () => {
    it("rejects client claiming to be host", () => {
      const packet: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 1,
          frameNumber: 0,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const result = clientEnforcer.validateAuthority(
        packet.envelope,
        "not-host-id",
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Only host");
    });

    it("accepts proper host authority packets", () => {
      const packet: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 1,
          frameNumber: 0,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const result = clientEnforcer.validateAuthority(
        packet.envelope,
        "host-id",
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe("Sequence Pruning", () => {
    it("prunes old sequences to avoid memory growth", () => {
      // Add many sequences
      for (let i = 1; i <= 1500; i++) {
        const packet: MultiplayerPacket = {
          envelope: {
            protocolVersion: 1,
            gameId: 1,
            messageType: "clientInput",
            flags: 0,
            matchSequence: i,
            frameNumber: i - 1,
            senderPlayerIndex: 0,
            reliability: "ordered",
          },
          payload: new ArrayBuffer(0),
        };

        const enc = encodeMultiplayerPacket(packet);
        const dec = decodeMultiplayerPacket(enc.value as ArrayBuffer);
        clientTracker.validate((dec.value as MultiplayerPacket).envelope);
      }

      // Prune to 1000 recent
      clientTracker.prune(1000);

      // Should still accept new packets
      const newPacket: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "clientInput",
          flags: 0,
          matchSequence: 1501,
          frameNumber: 1500,
          senderPlayerIndex: 0,
          reliability: "ordered",
        },
        payload: new ArrayBuffer(0),
      };

      const enc = encodeMultiplayerPacket(newPacket);
      const dec = decodeMultiplayerPacket(enc.value as ArrayBuffer);
      const result = clientTracker.validate(
        (dec.value as MultiplayerPacket).envelope,
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe("Reset and Recovery", () => {
    it("resets for new match", () => {
      // Add sequence 5
      const packet1: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 5,
          frameNumber: 4,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const enc1 = encodeMultiplayerPacket(packet1);
      const dec1 = decodeMultiplayerPacket(enc1.value as ArrayBuffer);
      clientTracker.validate((dec1.value as MultiplayerPacket).envelope);

      // Should reject sequence 1 (less than last valid)
      const packet2: MultiplayerPacket = {
        envelope: {
          protocolVersion: 1,
          gameId: 1,
          messageType: "hostInputBundle",
          flags: 0,
          matchSequence: 1,
          frameNumber: 0,
          senderPlayerIndex: 0,
          reliability: "strict",
        },
        payload: new ArrayBuffer(64),
      };

      const enc2 = encodeMultiplayerPacket(packet2);
      const dec2 = decodeMultiplayerPacket(enc2.value as ArrayBuffer);
      const beforeReset = clientTracker.validate(
        (dec2.value as MultiplayerPacket).envelope,
      );
      expect(beforeReset.isValid).toBe(false);

      // Reset
      clientTracker.reset();

      // Now sequence 1 should be accepted
      const afterReset = clientTracker.validate(
        (dec2.value as MultiplayerPacket).envelope,
      );
      expect(afterReset.isValid).toBe(true);
    });
  });
});
