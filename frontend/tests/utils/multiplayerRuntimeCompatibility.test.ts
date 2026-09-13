import { describe, expect, it } from "vitest";
import { validateRuntimeCompatibility } from "@/multiplayer/runtimeCompatibility";
import type { MultiplayerMatchConfig } from "@/multiplayer/types";

const config: MultiplayerMatchConfig = {
  lobbyId: "8ea6f249-20cb-41d7-b2cb-e9ee0a39cad3",
  matchId: "0f48f3e9-0eb9-4d44-b5da-e63b30f4452f",
  gameId: "cromagrally",
  mode: "multiplayerRace",
  trackOrLevel: "ice-ramp",
  seed: 12345,
  tagDurationMinutes: 3,
  hostPlayerIndex: 0,
  maxPlayers: 2,
  requiredProtocolVersion: 1,
  requiredRuntimeVersion: "host-authoritative-v2",
  hostParticipantId: "host-1",
  players: [],
};

const local = {
  protocolVersion: 1,
  runtimeVersion: "host-authoritative-v2",
};

describe("multiplayer runtime compatibility", () => {
  it("accepts an exact protocol and runtime match", () => {
    expect(validateRuntimeCompatibility(config, local).isOk()).toBe(true);
  });

  it("ignores content bundle differences", () => {
    const result = validateRuntimeCompatibility(config, {
      ...local,
    });
    expect(result.isOk()).toBe(true);
  });
});
