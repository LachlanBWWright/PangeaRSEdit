import { err, ok, type Result } from "neverthrow";
import type {
  MultiplayerMatchConfig,
  MultiplayerMatchResult,
  MultiplayerMatchResultPlayer,
} from "./types";

export function normalizeRuntimeMatchResult(
  runtimeResult: MultiplayerMatchResult,
  matchConfig: MultiplayerMatchConfig,
  endedAt: string,
): Result<MultiplayerMatchResult, string> {
  if (runtimeResult.players.length !== matchConfig.players.length) {
    return err("Runtime result player count does not match the lobby roster.");
  }

  const runtimePlayerByIndex = new Map(
    runtimeResult.players.map((player) => [player.playerIndex, player]),
  );
  const orderedPlayers = [...runtimeResult.players].sort(
    (left, right) =>
      left.placement - right.placement || left.playerIndex - right.playerIndex,
  );
  const rankByPlayerIndex = new Map(
    orderedPlayers.map((player, rank) => [player.playerIndex, rank]),
  );

  const players: MultiplayerMatchResultPlayer[] = [];
  for (const configPlayer of matchConfig.players) {
    const runtimePlayer = runtimePlayerByIndex.get(configPlayer.playerIndex);
    const placement = rankByPlayerIndex.get(configPlayer.playerIndex);
    if (!runtimePlayer || placement === undefined) {
      return err("Runtime result player indexes do not match the lobby roster.");
    }
    players.push({
      ...runtimePlayer,
      participantId: configPlayer.participantId,
      displayName: configPlayer.displayName,
      placement,
    });
  }

  if (
    runtimeResult.winnerPlayerIndex !== -1 &&
    !players.some(
      (player) => player.playerIndex === runtimeResult.winnerPlayerIndex,
    )
  ) {
    return err("Runtime result does not identify a valid winner.");
  }

  return ok({
    ...runtimeResult,
    lobbyId: matchConfig.lobbyId,
    matchId: matchConfig.matchId,
    gameId: matchConfig.gameId,
    mode: matchConfig.mode,
    trackOrLevel: matchConfig.trackOrLevel,
    seed: matchConfig.seed,
    endedAt,
    placements: orderedPlayers.map((player) => player.playerIndex),
    players,
  });
}
