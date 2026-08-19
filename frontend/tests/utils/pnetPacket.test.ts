import { describe, expect, it } from "vitest";
import {
  decodePnetHeader,
  deriveMatchIdPair,
  deriveRuntimeMatchIdPair,
} from "@/multiplayer/pnetPacket";

function encodePnetGameplayHeader(input: {
  readonly version: number;
  readonly packetType: number;
  readonly matchIdLow: number;
  readonly matchIdHigh: number;
  readonly tick: number;
  readonly sequence: number;
  readonly playerIndex: number;
}): ArrayBuffer {
  const bytes = new ArrayBuffer(28);
  const view = new DataView(bytes);
  view.setUint32(0, 0x54454e50, true);
  view.setUint16(4, input.version, true);
  view.setUint16(6, input.packetType, true);
  view.setUint32(8, input.matchIdLow, true);
  view.setUint32(12, input.matchIdHigh, true);
  view.setUint32(16, input.tick, true);
  view.setUint32(20, input.sequence, true);
  view.setUint16(24, input.playerIndex, true);
  view.setUint16(26, 0, true);
  return bytes;
}

describe("pnet packet identity", () => {
  it("derives the low and high match id words from the lobby id", () => {
    expect(
      deriveMatchIdPair("019e3c94-2bb3-76ae-85c8-3015ff1d0c69"),
    ).toEqual({
      low: 0xff1d0c69,
      high: 0x85c83015,
    });
  });

  it("uses the match seed when the low word is zero", () => {
    expect(
      deriveRuntimeMatchIdPair("019e3c94-2bb3-76ae-85c8-301500000000", 12345),
    ).toEqual({
      low: 12345,
      high: 0x85c83015,
    });
  });

  it("decodes current gameplay PNET v4 headers", () => {
    const decoded = decodePnetHeader(
      encodePnetGameplayHeader({
        version: 4,
        packetType: 3,
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
        tick: 12,
        sequence: 5,
        playerIndex: 1,
      }),
    );

    expect(decoded.isOk()).toBe(true);
    if (decoded.isErr()) {
      return;
    }
    expect(decoded.value).toEqual({
      magic: 0x54454e50,
      version: 4,
      packetType: 3,
      matchIdLow: 0x10203040,
      matchIdHigh: 0x50607080,
      tick: 12,
      sequence: 5,
      playerIndex: 1,
      reserved: 0,
    });
  });
});
