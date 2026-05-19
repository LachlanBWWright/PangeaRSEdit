import { Result, err, ok } from "neverthrow";
import type { MultiplayerMatchConfig } from "./types";

function normalizeParticipantId(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveLocalPlayerIndex(
  matchConfig: MultiplayerMatchConfig,
  localParticipantId: string | null | undefined,
): Result<number, string> {
  const normalizedLocalParticipantId =
    typeof localParticipantId === "string"
      ? normalizeParticipantId(localParticipantId)
      : "";
  if (normalizedLocalParticipantId.length === 0) {
    return err("Missing local participant identity for multiplayer runtime");
  }

  const localPlayer = matchConfig.players.find(
    (player) =>
      normalizeParticipantId(player.participantId) === normalizedLocalParticipantId,
  );

  if (!localPlayer) {
    return err(
      `Local participant ${localParticipantId} was not found in match player list`,
    );
  }

  return ok(localPlayer.playerIndex);
}

