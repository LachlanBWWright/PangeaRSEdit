import { describe, it, expect, beforeEach } from "vitest";
import {
  GameplaySequenceTracker,
  HostAuthorityEnforcer,
  DisruptionDetector,
} from "@/multiplayer/sequenceTracking";
import type { MultiplayerPacketEnvelope } from "@/multiplayer/protocol";

describe("GameplaySequenceTracker", () => {
  let tracker: GameplaySequenceTracker;

  beforeEach(() => {
    tracker = new GameplaySequenceTracker(false);
  });

  describe("strict reliability (host authority)", () => {
    it("accepts strictly increasing sequences", () => {
      const result1 = tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope);

      expect(result1.isValid).toBe(true);
      expect(result1.isDuplicate).toBe(false);

      const result2 = tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 2,
        frameNumber: 1,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope);

      expect(result2.isValid).toBe(true);
      expect(result2.isDuplicate).toBe(false);
    });

    it("rejects out-of-order sequences", () => {
      tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope);

      const result = tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope);

      expect(result.isValid).toBe(false);
      expect(result.isDuplicate).toBe(true);
    });

    it("detects gaps in sequence", () => {
      tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope);

      const result = tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 3,
        frameNumber: 2,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope);

      expect(result.isValid).toBe(true);
      expect(result.isGap).toBe(true);
      expect(result.reason).toContain("Gap detected");
    });

    it("rejects packets with sequence <= last valid", () => {
      tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 5,
        frameNumber: 4,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope);

      const result = tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 3,
        frameNumber: 2,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope);

      expect(result.isValid).toBe(false);
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe("ordered reliability", () => {
    it("accepts packets in any order", () => {
      const result1 = tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 3,
        frameNumber: 2,
        senderPlayerIndex: 0,
        reliability: "ordered",
      } as MultiplayerPacketEnvelope);

      expect(result1.isValid).toBe(true);

      const result2 = tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "ordered",
      } as MultiplayerPacketEnvelope);

      expect(result2.isValid).toBe(true);
    });

    it("rejects duplicate sequences even in ordered mode", () => {
      tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "ordered",
      } as MultiplayerPacketEnvelope);

      const result = tracker.validate({
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "ordered",
      } as MultiplayerPacketEnvelope);

      expect(result.isValid).toBe(false);
      expect(result.isDuplicate).toBe(true);
    });
  });

  it("rejects zero sequence", () => {
    const result = tracker.validate({
      protocolVersion: 1,
      gameId: 1,
      messageType: "clientInput",
      flags: 0,
      matchSequence: 0,
      frameNumber: 0,
      senderPlayerIndex: 0,
      reliability: "ordered",
    } as MultiplayerPacketEnvelope);

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("zero");
  });

  it("tracks last valid sequence and frame", () => {
    tracker.validate({
      protocolVersion: 1,
      gameId: 1,
      messageType: "clientInput",
      flags: 0,
      matchSequence: 5,
      frameNumber: 10,
      senderPlayerIndex: 0,
      reliability: "ordered",
    } as MultiplayerPacketEnvelope);

    expect(tracker.getLastValidSequence()).toBe(5);
    expect(tracker.getLastValidFrame()).toBe(10);
  });

  it("resets state", () => {
    tracker.validate({
      protocolVersion: 1,
      gameId: 1,
      messageType: "clientInput",
      flags: 0,
      matchSequence: 5,
      frameNumber: 10,
      senderPlayerIndex: 0,
      reliability: "ordered",
    } as MultiplayerPacketEnvelope);

    tracker.reset();

    expect(tracker.getLastValidSequence()).toBe(0);
    expect(tracker.getLastValidFrame()).toBe(0);

    // Should accept sequence 1 again after reset
    const result = tracker.validate({
      protocolVersion: 1,
      gameId: 1,
      messageType: "clientInput",
      flags: 0,
      matchSequence: 1,
      frameNumber: 0,
      senderPlayerIndex: 0,
      reliability: "ordered",
    } as MultiplayerPacketEnvelope);

    expect(result.isValid).toBe(true);
  });
});

describe("HostAuthorityEnforcer", () => {
  let enforcer: HostAuthorityEnforcer;

  beforeEach(() => {
    enforcer = new HostAuthorityEnforcer(false, "host-participant-id");
  });

  it("requires host to send host input bundle with strict reliability", () => {
    const result = enforcer.validateAuthority(
      {
        protocolVersion: 1,
        gameId: 1,
        messageType: "hostInputBundle",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "ordered",
      } as MultiplayerPacketEnvelope,
      "host-participant-id",
    );

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("strict reliability");
  });

  it("only allows host to send host input bundle", () => {
    const result = enforcer.validateAuthority(
      {
        protocolVersion: 1,
        gameId: 1,
        messageType: "hostInputBundle",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 0,
        reliability: "strict",
      } as MultiplayerPacketEnvelope,
      "client-participant-id",
    );

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Only host");
  });

  it("only allows host to end match", () => {
    const result = enforcer.validateAuthority(
      {
        protocolVersion: 1,
        gameId: 1,
        messageType: "matchEnd",
        flags: 0,
        matchSequence: 1,
        frameNumber: 100,
        senderPlayerIndex: 0,
        reliability: "ordered",
      } as MultiplayerPacketEnvelope,
      "client-participant-id",
    );

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Only host can end");
  });

  it("allows client input from non-host", () => {
    const result = enforcer.validateAuthority(
      {
        protocolVersion: 1,
        gameId: 1,
        messageType: "clientInput",
        flags: 0,
        matchSequence: 1,
        frameNumber: 0,
        senderPlayerIndex: 1,
        reliability: "ordered",
      } as MultiplayerPacketEnvelope,
      "client-participant-id",
    );

    expect(result.isValid).toBe(true);
  });
});

describe("DisruptionDetector", () => {
  let detector: DisruptionDetector;

  beforeEach(() => {
    detector = new DisruptionDetector(100, 2);
  });

  it("tracks packet receipt", () => {
    detector.recordPacket();
    expect(detector.getElapsedSinceLastPacket()).toBeLessThan(10);
  });

  it("detects timeout", () => {
    detector = new DisruptionDetector(50, 2);

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(detector.shouldPause()).toBe(true);
        expect(detector.getElapsedSinceLastPacket()).toBeGreaterThan(50);
        resolve(undefined);
      }, 60);
    });
  });

  it("resets on valid packet", () => {
    detector.recordMissing();
    detector.recordMissing();
    expect(detector.shouldPause()).toBe(true);

    detector.recordPacket();
    expect(detector.shouldPause()).toBe(false);
  });

  it("counts consecutive missing", () => {
    expect(detector.shouldPause()).toBe(false);

    detector.recordMissing();
    expect(detector.shouldPause()).toBe(false);

    detector.recordMissing();
    expect(detector.shouldPause()).toBe(true);
  });
});
