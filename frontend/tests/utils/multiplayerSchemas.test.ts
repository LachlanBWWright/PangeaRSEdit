import { describe, expect, it } from "vitest";
import { MultiplayerMatchConfigSchema } from "@/multiplayer/schemas";

describe("multiplayer match config schema", () => {
  const validConfig = {
    lobbyId: "8ea6f249-20cb-41d7-b2cb-e9ee0a39cad3",
    matchId: "0f48f3e9-0eb9-4d44-b5da-e63b30f4452f",
    gameId: "cromagrally",
    mode: "multiplayerRace",
    trackOrLevel: "ice-ramp",
    seed: 12345,
    hostPlayerIndex: 0,
    maxPlayers: 2,
    requiredProtocolVersion: 1,
    requiredRuntimeVersion: "host-authoritative-v2",
    hostParticipantId: "host-1",
    players: [
      {
        participantId: "host-1",
        playerIndex: 0,
        displayName: "Host",
        connectionState: "connected",
      },
      {
        participantId: "guest-1",
        playerIndex: 1,
        displayName: "Guest",
        connectionState: "connected",
      },
    ],
  };

  it("accepts valid configs", () => {
    const parsed = MultiplayerMatchConfigSchema.safeParse(validConfig);
    expect(parsed.success).toBe(true);
  });

  it("rejects missing players", () => {
    const parsed = MultiplayerMatchConfigSchema.safeParse({
      ...validConfig,
      players: undefined,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid seed", () => {
    const parsed = MultiplayerMatchConfigSchema.safeParse({
      ...validConfig,
      seed: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid match id", () => {
    const parsed = MultiplayerMatchConfigSchema.safeParse({
      ...validConfig,
      matchId: "invalid-id",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid player indexes", () => {
    const parsed = MultiplayerMatchConfigSchema.safeParse({
      ...validConfig,
      players: [
        {
          participantId: "host-1",
          playerIndex: -1,
          displayName: "Host",
          connectionState: "connected",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
