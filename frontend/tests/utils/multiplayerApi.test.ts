import { afterEach, describe, expect, it, vi } from "vitest";
import { createLobby } from "@/multiplayer/api";

describe("multiplayer api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a valid create lobby response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            id: "9340ea45-789f-4072-abd2-5f40eac9e4e0",
            gameId: "cromagrally",
            mode: "multiplayerRace",
            trackOrLevel: "ice-ramp",
            maxPlayers: 2,
            hostParticipantId: "host-1",
            joinCode: "ABC123",
            state: "open",
            createdAt: "2026-01-01T00:00:00.000Z",
            expiresAt: "2026-01-01T01:00:00.000Z",
            participantId: "host-1",
            players: [
              {
                participantId: "host-1",
                displayName: "Host",
                playerIndex: 0,
                isHost: true,
                isReady: false,
                joinedAt: "2026-01-01T00:00:00.000Z",
                lastSeenAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          }),
      }),
    );

    const result = await createLobby({
      gameId: "cromagrally",
      mode: "multiplayerRace",
      trackOrLevel: "ice-ramp",
      maxPlayers: 2,
      displayName: "Host",
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.gameId).toBe("cromagrally");
      expect(result.value.players.length).toBe(1);
    }
  });

  it("returns typed schema errors for invalid payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            invalid: true,
          }),
      }),
    );

    const result = await createLobby({
      gameId: "cromagrally",
      mode: "multiplayerRace",
      trackOrLevel: "ice-ramp",
      maxPlayers: 2,
      displayName: "Host",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("schema.invalid");
      expect(result.error.status).toBe(200);
    }
  });
});
