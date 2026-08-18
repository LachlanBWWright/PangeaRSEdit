import { describe, expect, it, vi } from "vitest";
import type { MutableRefObject } from "react";
import type { MultiplayerLobbyDetails } from "@/multiplayer/types";
import type { HostSession } from "@/multiplayer/webrtc/hostSession";
import type { ClientSession } from "@/multiplayer/webrtc/clientSession";
import type { MultiplayerHubClient } from "@/multiplayer/hub";
import { createMultiplayerHubEvents } from "./createMultiplayerHubEvents";
import type { CreateMultiplayerHubEventsInput } from "./createMultiplayerHubEvents";

function mutableRef<T>(current: T): MutableRefObject<T> {
  return { current };
}

function makeLobby(): MultiplayerLobbyDetails {
  return {
    id: "lobby-1",
    gameId: "cromagrally",
    mode: "multiplayerRace",
    trackOrLevel: "1",
    tagDurationMinutes: 3,
    maxPlayers: 2,
    isPublic: true,
    hostParticipantId: "participant-1",
    joinCode: "ABC123",
    state: "waiting",
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: "2026-01-01T01:00:00Z",
    players: [],
    participantId: "participant-1",
    matchConfig: null,
    matchResult: null,
  };
}

function makeInput(): CreateMultiplayerHubEventsInput {
  return {
    nextLobby: makeLobby(),
    participantId: "participant-1",
    hostSessionRef: mutableRef<HostSession | null>(null),
    clientSessionRef: mutableRef<ClientSession | null>(null),
    hostRuntimeMuxRef: mutableRef(null),
    lobbyRef: mutableRef<MultiplayerLobbyDetails | null>(makeLobby()),
    localParticipantIdRef: mutableRef<string | null>("participant-1"),
    hubClientRef: mutableRef<MultiplayerHubClient | null>(null),
    runtimeReadyPeersRef: mutableRef(new Set<string>()),
    startNetworkMatchRef: mutableRef(null),
    runtimeStartRequestedRef: mutableRef(false),
    runtimeStartNotifiedRef: mutableRef(false),
    setStatusText: vi.fn(),
    setErrorText: vi.fn(),
    setLobby: vi.fn(),
    setUiState: vi.fn(),
    setLocalParticipantId: vi.fn(),
    setPingMs: vi.fn(),
    setChatMessages: vi.fn(),
    resetLobbyChatState: vi.fn(),
    closeRuntimeTransport: vi.fn(),
    observeRtcResult: vi.fn(),
  };
}

describe("createMultiplayerHubEvents", () => {
  it("moves a match into runtime loading when the hub starts it", () => {
    const input = makeInput();
    const events = createMultiplayerHubEvents(input);
    const matchConfig = {
      lobbyId: "lobby-1",
      matchId: "match-1",
      gameId: "cromagrally",
      mode: "multiplayerRace",
      trackOrLevel: "1",
      seed: 1,
      tagDurationMinutes: 3,
      hostPlayerIndex: 0,
      maxPlayers: 2,
      requiredProtocolVersion: 1,
      requiredRuntimeVersion: "host-authoritative-v2",
      requiredContentHash: "development-unpinned",
      hostParticipantId: "participant-1",
      players: [],
    };

    events.onMatchStarting?.("lobby-1", matchConfig);

    expect(input.setUiState).toHaveBeenCalledWith("loading-runtime");
    expect(input.setStatusText).toHaveBeenCalledWith("Loading runtime…");
    expect(input.runtimeStartRequestedRef.current).toBe(false);
    expect(input.runtimeStartNotifiedRef.current).toBe(false);
  });

  it("requests a deferred start when the runtime is ready before the game starts", () => {
    const input = makeInput();
    const events = createMultiplayerHubEvents(input);

    events.onRuntimeStartNow?.("lobby-1");

    expect(input.runtimeStartRequestedRef.current).toBe(true);
  });

  it("appends incoming chat through the state updater", () => {
    const input = makeInput();
    const events = createMultiplayerHubEvents(input);

    events.onLobbyChatMessage?.(
      "lobby-1",
      "participant-2",
      "Racer",
      "Ready!",
      "2026-01-01T00:00:00Z",
    );

    expect(input.setChatMessages).toHaveBeenCalledOnce();
  });
});
