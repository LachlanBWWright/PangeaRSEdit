import { createRef } from "react";
import { fn } from "storybook/test";
import { countReadyPlayers } from "@/multiplayer/lobbyDisplay";
import { defaultTrackForMode } from "@/multiplayer/menuOptions";
import { deriveDisplayedMatchPhase, deriveMatchKind } from "@/multiplayer/matchState";
import type { MultiplayerLobbyDetails, MultiplayerLobbyPlayer, MultiplayerLobbySummary } from "@/multiplayer/types";
import type { MultiplayerSessionViewProps } from "@/pages/Multiplayer/types";

export const HOST: MultiplayerLobbyPlayer = {
  participantId: "participant-host", displayName: "Alex", playerIndex: 0,
  isHost: true, isReady: true, region: "Sydney", pingMs: 18,
  joinedAt: "2026-08-27T09:01:00.000Z", lastSeenAt: "2026-08-27T09:05:00.000Z",
};

export const GUEST: MultiplayerLobbyPlayer = {
  ...HOST, participantId: "participant-guest-1", playerIndex: 1,
  displayName: "SamiraWithAQuiteLongDisplayName", isHost: false,
  region: "Melbourne", pingMs: 42,
};

export const WAITING_GUEST: MultiplayerLobbyPlayer = {
  ...GUEST, participantId: "participant-guest-2", playerIndex: 2,
  displayName: "Jordan", isReady: false, region: "Auckland", pingMs: 76,
};

export const STORY_LOBBY: MultiplayerLobbyDetails = {
  id: "cromag-rally-lobby-7f3a2b9c", gameId: "cromagrally", mode: "multiplayerRace",
  trackOrLevel: "3", tagDurationMinutes: 3, maxPlayers: 4, isPublic: true,
  hostParticipantId: HOST.participantId, participantId: HOST.participantId,
  joinCode: "RALLY3", state: "open",
  createdAt: "2026-08-27T09:00:00.000Z", expiresAt: "2026-08-27T10:00:00.000Z",
  players: [HOST, GUEST, WAITING_GUEST],
};

export const FULL_STORY_LOBBY: MultiplayerLobbyDetails = {
  ...STORY_LOBBY, maxPlayers: 6,
  players: [HOST, GUEST, WAITING_GUEST,
    { ...WAITING_GUEST, participantId: "guest-3", playerIndex: 3, displayName: "Morgan", region: "Perth", pingMs: 92 },
    { ...GUEST, participantId: "guest-4", playerIndex: 4, displayName: "Taylor", region: "Brisbane", pingMs: 54 },
    { ...WAITING_GUEST, participantId: "guest-5", playerIndex: 5, displayName: "Casey", region: "Adelaide", pingMs: 63 },
  ],
};

export const NANOSAUR_STORY_LOBBY: MultiplayerLobbyDetails = {
  ...STORY_LOBBY, id: "nanosaur-lobby", gameId: "nanosaur2", mode: "multiplayerFlag",
  trackOrLevel: defaultTrackForMode("nanosaur2", "multiplayerFlag"),
  maxPlayers: 2, joinCode: "NANO22", players: [HOST, GUEST],
};

export const STORY_LOBBIES: readonly MultiplayerLobbySummary[] = [
  { ...STORY_LOBBY, playerCount: 2, canJoin: true },
  { ...NANOSAUR_STORY_LOBBY, mode: "multiplayerRace", trackOrLevel: "3", playerCount: 1, canJoin: true },
  { ...STORY_LOBBY, id: "full-lobby", mode: "multiplayerSurvival",
    trackOrLevel: defaultTrackForMode("cromagrally", "multiplayerSurvival"),
    maxPlayers: 2, joinCode: "FULL12", playerCount: 2, canJoin: false },
  { ...STORY_LOBBY, id: "started-lobby", joinCode: "RACE44", state: "started", playerCount: 3, canJoin: false },
];

export function createSessionStoryProps(
  lobby: MultiplayerLobbyDetails = STORY_LOBBY,
  participantId: string = HOST.participantId,
): MultiplayerSessionViewProps {
  const participant = lobby.players.find((player) => player.participantId === participantId);
  const isHost = participant?.isHost ?? false;
  const readyPlayerCount = countReadyPlayers(lobby);
  const waiting = lobby.state === "open" || lobby.state === "match_ended";
  return {
    lobby, localParticipantId: participantId, localPlayerIndex: participant?.playerIndex ?? null,
    isHost, readyPlayerCount, localParticipantIsReady: participant?.isReady ?? false,
    hasLocalParticipant: participant !== undefined, showDebugOverlay: false,
    connectionStatus: "connected", currentMatchPhase: deriveDisplayedMatchPhase({ lobbyState: lobby.state, uiState: "in-lobby" }), rtcStatusText: "waiting for peers",
    displayedPingMs: participant?.pingMs ?? null, currentMatchKind: deriveMatchKind(lobby.mode), hudLabel: "Lobby HUD",
    statusText: "Waiting for players", errorText: null, busy: false,
    activeMatchConfigPresent: false, gameCanvasRef: createRef<HTMLCanvasElement>(),
    canStartLobby: isHost && waiting && lobby.players.length >= 2 && readyPlayerCount === lobby.players.length,
    canForceStartLobby: isHost && waiting && lobby.players.length >= 2 && readyPlayerCount < lobby.players.length,
    canEndMatch: isHost && lobby.state === "started",
    chatMessages: [{ lobbyId: lobby.id, participantId: GUEST.participantId,
      displayName: GUEST.displayName, message: "Ready when you are!", createdAt: "2026-08-27T09:04:00.000Z" }],
    chatDraft: "", packetCounts: { hostSnapshot: 64, clientInput: 60 },
    runtimeDebugStats: {
      sentReliable: 128, sentUnreliable: 64, received: 124, polled: 120, rejected: 0,
      impairedDropped: 0, impairedDelayed: 0, queueDepth: 1,
      lastPacketType: 4, lastPacketSequence: 128, lastPacketDirection: "recv", lastError: null,
    },
    nativeDebugStats: {
      frameNumber: 642, hasDesync: false, lastSyncHash: 1842, lastVisualEventSequence: 8,
      appliedVisualEventSequence: 8, duplicateVisualEventCount: 0, staleVisualEventCount: 0,
    },
    networkDebugOptions: { latencyMs: 0, packetLossPercent: 0, packetBurstPercent: 0, packetBurstSize: 1 },
    onCopyLobbyId: fn(), onRemoveParticipant: fn(), onChatDraftChange: fn(), onSendChat: fn(),
    onToggleReady: fn(), onStart: fn(), onStartAnyway: fn(), onUpdateSelection: fn(),
    onEndMatch: fn(), onLeave: fn(), onResetNetworkDebugOptions: fn(), onUpdateNetworkDebugOption: fn(),
  };
}
