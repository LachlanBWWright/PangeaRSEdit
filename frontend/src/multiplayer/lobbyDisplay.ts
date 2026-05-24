import type {
  MultiplayerLobbyDetails,
  MultiplayerLobbyPlayer,
  MultiplayerLobbySummary,
} from "./types";
import { formatMultiplayerModeLabel } from "./modes";

export function formatLobbyGameLabel(gameId: string): string {
  if (gameId === "cromagrally") {
    return "Cro-Mag Rally";
  }
  if (gameId === "nanosaur2") {
    return "Nanosaur 2";
  }
  return gameId;
}

export function formatLobbyModeLabel(mode: string): string {
  return formatMultiplayerModeLabel(mode);
}

export function isLobbyJoinable(lobby: MultiplayerLobbySummary): boolean {
  if (lobby.canJoin !== undefined) {
    return lobby.canJoin;
  }
  return lobby.state === "open" && lobby.playerCount < lobby.maxPlayers;
}

export function getLobbyAvailabilityLabel(
  lobby: MultiplayerLobbySummary,
): string {
  if (isLobbyJoinable(lobby)) {
    return "Open";
  }
  if (lobby.state !== "open") {
    return lobby.state;
  }
  if (lobby.playerCount >= lobby.maxPlayers) {
    return "Full";
  }
  return "Unavailable";
}

export function formatLobbyVisibility(isPublic: boolean): string {
  return isPublic ? "Public" : "Private";
}

export function getPlayerReadyLabel(player: MultiplayerLobbyPlayer): string {
  return player.isReady ? "Ready" : "Not ready";
}

export function countReadyPlayers(lobby: MultiplayerLobbyDetails): number {
  return lobby.players.filter((player) => player.isReady).length;
}
