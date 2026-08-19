import type { MultiplayerHubClient } from "@/multiplayer/hub";
import type { MultiplayerLobbyDetails } from "@/multiplayer/types";

export function updateLobbyWithReadyChange(
  lobby: MultiplayerLobbyDetails,
  participantId: string,
  isReady: boolean,
): MultiplayerLobbyDetails {
  return {
    ...lobby,
    players: lobby.players.map((player) =>
      player.participantId === participantId
        ? {
            ...player,
            isReady,
          }
        : player,
    ),
  };
}

export function getConnectionStatus(
  client: MultiplayerHubClient | null,
): string {
  if (!client) {
    return "disconnected";
  }
  return String(client.state).toLowerCase();
}
