import { describe, expect, it } from "vitest";
import {
  deriveMatchIdPair,
  deriveRuntimeMatchIdPair,
} from "@/multiplayer/pnetPacket";

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
});
