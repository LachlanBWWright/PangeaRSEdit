import type { MultiplayerPacketEnvelope } from "./protocol";

/**
 * Tracks packet sequences and detects duplicates, gaps, and out-of-order delivery.
 * Implements strict host-authority and ordered delivery validation.
 */
export interface SequenceValidationResult {
  readonly isValid: boolean;
  readonly isDuplicate: boolean;
  readonly isGap: boolean;
  readonly expectedSequence?: number;
  readonly reason?: string;
}

export class GameplaySequenceTracker {
  private lastValidSequence = 0;
  private lastValidFrame = 0;
  private seenSequences = new Set<number>();
  private readonly isHost: boolean;

  constructor(isHost: boolean) {
    this.isHost = isHost;
  }

  /**
   * Validate an incoming gameplay packet.
   * For host-authority (strict) packets: enforces strictly increasing sequences.
   * For ordered packets: allows out-of-order but rejects duplicates.
   */
  validate(envelope: MultiplayerPacketEnvelope): SequenceValidationResult {
    // Sanity check: sequence should be non-zero for gameplay
    if (envelope.matchSequence === 0) {
      return {
        isValid: false,
        isDuplicate: false,
        isGap: false,
        reason: "Invalid sequence: zero is reserved",
      };
    }

    const reliability = envelope.reliability ?? "ordered";

    // Check for duplicates
    if (this.seenSequences.has(envelope.matchSequence)) {
      return {
        isValid: false,
        isDuplicate: true,
        isGap: false,
        reason: `Duplicate sequence: ${envelope.matchSequence}`,
      };
    }

    if (reliability === "strict") {
      // Host authority: sequences must be strictly increasing
      if (envelope.matchSequence <= this.lastValidSequence) {
        return {
          isValid: false,
          isDuplicate: false,
          isGap: false,
          expectedSequence: this.lastValidSequence + 1,
          reason: `Out-of-order sequence for strict packet: expected > ${this.lastValidSequence}, got ${envelope.matchSequence}`,
        };
      }

      // Store previous for gap detection
      const previousSequence = this.lastValidSequence;

      // Update state for next validation
      this.lastValidSequence = envelope.matchSequence;
      this.lastValidFrame = envelope.frameNumber;
      this.seenSequences.add(envelope.matchSequence);

      // Check for gaps in host-authority
      if (envelope.matchSequence > previousSequence + 1) {
        const gap = envelope.matchSequence - previousSequence - 1;
        return {
          isValid: true, // Accept but report gap
          isDuplicate: false,
          isGap: true,
          expectedSequence: previousSequence + 1,
          reason: `Gap detected: ${gap} missing sequence(s) before ${envelope.matchSequence}`,
        };
      }

      return { isValid: true, isDuplicate: false, isGap: false };
    }

    // Ordered (non-strict) mode: accept after validation
    this.lastValidSequence = Math.max(
      this.lastValidSequence,
      envelope.matchSequence,
    );
    this.lastValidFrame = envelope.frameNumber;
    this.seenSequences.add(envelope.matchSequence);

    return { isValid: true, isDuplicate: false, isGap: false };
  }

  /**
   * Reset sequence tracking for a new match.
   */
  reset(): void {
    this.lastValidSequence = 0;
    this.lastValidFrame = 0;
    this.seenSequences.clear();
  }

  /**
   * Get the last validated sequence number.
   */
  getLastValidSequence(): number {
    return this.lastValidSequence;
  }

  /**
   * Get the last validated frame number.
   */
  getLastValidFrame(): number {
    return this.lastValidFrame;
  }

  /**
   * Clear old sequences from the tracking set to avoid unbounded growth.
   * Clears sequences older than a given window.
   */
  prune(keepRecentCount: number = 1000): void {
    if (this.seenSequences.size > keepRecentCount) {
      const sorted = Array.from(this.seenSequences).sort((a, b) => a - b);
      const threshold = sorted[sorted.length - keepRecentCount];
      for (const seq of this.seenSequences) {
        if (seq < threshold) {
          this.seenSequences.delete(seq);
        }
      }
    }
  }
}

/**
 * Host authority enforcer: validates that packets follow host-authority rules.
 */
export class HostAuthorityEnforcer {
  private isHost: boolean;
  private hostParticipantId: string;

  constructor(isHost: boolean, hostParticipantId: string) {
    this.isHost = isHost;
    this.hostParticipantId = hostParticipantId;
  }

  /**
   * Check if a packet violates host authority.
   * - Host sends with strict reliability
   * - Non-host packets should come from players (playerIndex matches envelope)
   * - Gameplay state changes must come from host
   */
  validateAuthority(
    envelope: MultiplayerPacketEnvelope,
    senderParticipantId: string,
  ): { isValid: boolean; reason?: string } {
    // Host control bundles must use strict reliability
    if (
      envelope.messageType === "hostInputBundle" &&
      envelope.reliability !== "strict"
    ) {
      return {
        isValid: false,
        reason: "Host input bundle must use strict reliability",
      };
    }

    // Only host can send host control bundles
    if (
      envelope.messageType === "hostInputBundle" &&
      senderParticipantId !== this.hostParticipantId
    ) {
      return {
        isValid: false,
        reason: "Only host can send host input bundles",
      };
    }

    // End-state packets must come from host
    if (
      envelope.messageType === "matchEnd" &&
      senderParticipantId !== this.hostParticipantId
    ) {
      return {
        isValid: false,
        reason: "Only host can end a match",
      };
    }

    // Resume packets should come from host
    if (
      envelope.messageType === "resumeRequest" &&
      senderParticipantId !== this.hostParticipantId
    ) {
      return {
        isValid: false,
        reason: "Only host can resume a match",
      };
    }

    // Snapshot and authoritative state packets must come from host
    if (
      (envelope.messageType === "hostSnapshot" ||
        envelope.messageType === "hostCorrection" ||
        envelope.messageType === "hostEvent" ||
        envelope.messageType === "hostPause" ||
        envelope.messageType === "hostResume" ||
        envelope.messageType === "hostDisconnect") &&
      senderParticipantId !== this.hostParticipantId
    ) {
      return {
        isValid: false,
        reason: `Only host can send ${envelope.messageType} messages`,
      };
    }

    return { isValid: true };
  }
}

/**
 * Detects and tracks network disruption patterns.
 */
export class DisruptionDetector {
  private lastPacketTime: number;
  private readonly timeoutMs: number;
  private consecutiveMissing = 0;
  private readonly maxConsecutiveMissing: number;

  constructor(timeoutMs: number = 6000, maxConsecutiveMissing: number = 3) {
    this.lastPacketTime = Date.now();
    this.timeoutMs = timeoutMs;
    this.maxConsecutiveMissing = maxConsecutiveMissing;
  }

  /**
   * Record a valid packet received.
   */
  recordPacket(): void {
    this.lastPacketTime = Date.now();
    this.consecutiveMissing = 0;
  }

  /**
   * Record a missing or invalid packet.
   */
  recordMissing(): void {
    this.consecutiveMissing += 1;
  }

  /**
   * Check if we should pause due to disruption.
   */
  shouldPause(): boolean {
    return (
      this.consecutiveMissing >= this.maxConsecutiveMissing ||
      Date.now() - this.lastPacketTime > this.timeoutMs
    );
  }

  /**
   * Check elapsed time since last valid packet.
   */
  getElapsedSinceLastPacket(): number {
    return Date.now() - this.lastPacketTime;
  }

  /**
   * Reset disruption state.
   */
  reset(): void {
    this.consecutiveMissing = 0;
    this.lastPacketTime = Date.now();
  }
}
