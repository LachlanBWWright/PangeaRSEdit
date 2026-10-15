import { defaultTrackForMode } from "@/multiplayer/menuOptions";
import type { MultiplayerLobbyDetails } from "@/multiplayer/types";
import type { LobbyChatMessage } from "@/pages/Multiplayer/types";

export function toggleStoryReady(lobby: MultiplayerLobbyDetails, participantId: string | null): MultiplayerLobbyDetails {
  return { ...lobby, players: lobby.players.map((player) => player.participantId === participantId
    ? { ...player, isReady: !player.isReady } : player) };
}

export function selectStoryMap(lobby: MultiplayerLobbyDetails, mode: string, trackOrLevel: string, tagDurationMinutes: number): MultiplayerLobbyDetails {
  return { ...lobby, mode, trackOrLevel: trackOrLevel || defaultTrackForMode(lobby.gameId, mode), tagDurationMinutes };
}

export function appendStoryChat(
  messages: readonly LobbyChatMessage[], lobby: MultiplayerLobbyDetails,
  participantId: string | null, draft: string,
): readonly LobbyChatMessage[] {
  const participant = lobby.players.find((player) => player.participantId === participantId);
  if (!participant || !draft.trim()) return messages;
  return [...messages, {
    lobbyId: lobby.id, participantId: participant.participantId, displayName: participant.displayName,
    message: draft.trim(), createdAt: `2026-08-27T09:06:${String(messages.length).padStart(2, "0")}.000Z`,
  }];
}
