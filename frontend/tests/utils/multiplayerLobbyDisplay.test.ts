import { describe, expect, it } from "vitest";
import {
  formatLobbyGameLabel,
  formatLobbyModeLabel,
  getLobbyAvailabilityLabel,
  isLobbyJoinable,
} from "@/multiplayer/lobbyDisplay";
import { filterPublicLobbies, resolveDirectJoinLobbyId } from "@/multiplayer/menuOptions";

describe("multiplayer lobby display", () => {
  it("formats game and mode labels", () => {
    expect(formatLobbyGameLabel("cromagrally")).toBe("Cro-Mag Rally");
    expect(formatLobbyGameLabel("nanosaur2")).toBe("Nanosaur 2");
    expect(formatLobbyModeLabel("multiplayerTag1")).toBe("Tag: Keep Away");
    expect(formatLobbyModeLabel("multiplayerQuestForFire")).toBe(
      "Quest for Fire",
    );
    expect(formatLobbyModeLabel("multiplayerFlag")).toBe("Capture the Flag");
  });

  it("derives joinability and availability labels", () => {
    const joinableLobby = {
      id: "00000000-0000-4000-8000-000000000001",
      gameId: "cromagrally",
      mode: "multiplayerRace",
      trackOrLevel: "1",
      maxPlayers: 2,
      isPublic: true,
      joinCode: "PLAY01",
      state: "open",
      playerCount: 1,
      canJoin: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T01:00:00.000Z",
    } as const;
    const fullLobby = {
      ...joinableLobby,
      playerCount: 2,
      canJoin: false,
    };

    expect(isLobbyJoinable(joinableLobby)).toBe(true);
    expect(getLobbyAvailabilityLabel(joinableLobby)).toBe("Open");
    expect(isLobbyJoinable(fullLobby)).toBe(false);
    expect(getLobbyAvailabilityLabel(fullLobby)).toBe("Full");
  });

  it("resolves direct join input from join codes when available", () => {
    const lobbyId = resolveDirectJoinLobbyId("play01", [
      {
        id: "00000000-0000-4000-8000-000000000001",
        gameId: "cromagrally",
        mode: "multiplayerRace",
        trackOrLevel: "1",
        maxPlayers: 2,
        isPublic: true,
        joinCode: "PLAY01",
        state: "open",
        playerCount: 1,
        canJoin: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T01:00:00.000Z",
      },
    ]);

    expect(lobbyId).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("filters detailed Cro-Mag modes by shared lobby kind", () => {
    const lobbies = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        gameId: "cromagrally",
        mode: "multiplayerTag1",
        trackOrLevel: "10",
        maxPlayers: 2,
        isPublic: true,
        joinCode: "PLAY01",
        state: "open",
        playerCount: 1,
        canJoin: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T01:00:00.000Z",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        gameId: "cromagrally",
        mode: "multiplayerQuestForFire",
        trackOrLevel: "10",
        maxPlayers: 2,
        isPublic: true,
        joinCode: "PLAY02",
        state: "open",
        playerCount: 1,
        canJoin: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T01:00:00.000Z",
      },
    ] as const;

    expect(filterPublicLobbies(lobbies, "all", "battle")).toHaveLength(1);
    expect(filterPublicLobbies(lobbies, "all", "capture-the-flag")).toHaveLength(1);
  });
});
