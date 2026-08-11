import { describe, expect, it } from "vitest";
import { normalizeRuntimeMatchResult } from "@/multiplayer/normalizeRuntimeMatchResult";
import type {
  MultiplayerMatchConfig,
  MultiplayerMatchResult,
} from "@/multiplayer/types";

const matchConfig: MultiplayerMatchConfig = {
  lobbyId: "11111111-1111-4111-8111-111111111111",
  matchId: "22222222-2222-4222-8222-222222222222",
  gameId: "cromagrally",
  mode: "multiplayerQuestForFire",
  trackOrLevel: "10",
  seed: 42,
  tagDurationMinutes: 3,
  hostPlayerIndex: 0,
  maxPlayers: 3,
  requiredProtocolVersion: 1,
  requiredRuntimeVersion: "host-authoritative-v2",
  requiredContentHash: "content",
  hostParticipantId: "host-id",
  players: [
    { participantId: "host-id", playerIndex: 0, displayName: "Host", connectionState: "connected" },
    { participantId: "guest-a", playerIndex: 1, displayName: "Guest A", connectionState: "connected" },
    { participantId: "guest-b", playerIndex: 2, displayName: "Guest B", connectionState: "connected" },
  ],
};

const runtimeResult: MultiplayerMatchResult = {
  lobbyId: matchConfig.lobbyId,
  matchId: matchConfig.matchId,
  gameId: "cromagrally",
  mode: "multiplayerQuestForFire",
  trackOrLevel: "10",
  seed: 42,
  endedAt: "1970-01-01T00:00:00Z",
  endReason: "level-completed",
  winnerPlayerIndex: 2,
  winningTeam: "0",
  placements: [2, 1, 1],
  players: [
    { participantId: "player0", playerIndex: 0, displayName: "Player 1", team: "1", placement: 2, finished: false, eliminated: false, score: 1, timeMs: 0, lapsCompleted: 0, checkpoint: 0 },
    { participantId: "player1", playerIndex: 1, displayName: "Player 2", team: "1", placement: 2, finished: false, eliminated: false, score: 1, timeMs: 0, lapsCompleted: 0, checkpoint: 0 },
    { participantId: "player2", playerIndex: 2, displayName: "Player 3", team: "0", placement: 1, finished: false, eliminated: false, score: 3, timeMs: 0, lapsCompleted: 0, checkpoint: 0 },
  ],
};

describe("normalizeRuntimeMatchResult", () => {
  it("maps native player slots to the lobby roster and unique zero-based ranks", () => {
    const result = normalizeRuntimeMatchResult(
      runtimeResult,
      matchConfig,
      "2026-08-11T10:00:00.000Z",
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.placements).toEqual([2, 0, 1]);
    expect(result.value.players.map((player) => player.participantId)).toEqual([
      "host-id",
      "guest-a",
      "guest-b",
    ]);
    expect(result.value.players.map((player) => player.placement)).toEqual([1, 2, 0]);
    expect(result.value.endedAt).toBe("2026-08-11T10:00:00.000Z");
  });

  it("rejects a native roster that does not match the active match", () => {
    const result = normalizeRuntimeMatchResult(
      { ...runtimeResult, players: runtimeResult.players.slice(0, 2) },
      matchConfig,
      "2026-08-11T10:00:00.000Z",
    );

    expect(result.isErr()).toBe(true);
  });
});
