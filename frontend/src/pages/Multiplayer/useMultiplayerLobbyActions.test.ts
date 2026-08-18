import { beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "neverthrow";
import {
  createLobby,
  endLobbyMatch,
  getLobbyPreview,
  joinLobby,
  leaveLobby,
  rematchLobby,
  reportParticipantDisconnected,
  setLobbyReady,
  startLobby,
  updateLobbySelection,
} from "@/multiplayer/api";
import { preflightSelection } from "@/multiplayer/preflightSelection";
import type {
  MultiplayerLobbyDetails,
  MultiplayerLobbySummary,
} from "@/multiplayer/types";
import type { LobbyFormState } from "@/multiplayer/menuOptions";
import { useMultiplayerLobbyActions } from "./useMultiplayerLobbyActions";

vi.mock("@/multiplayer/api", () => ({
  createLobby: vi.fn(),
  endLobbyMatch: vi.fn(),
  getLobbyPreview: vi.fn(),
  joinLobby: vi.fn(),
  leaveLobby: vi.fn(),
  rematchLobby: vi.fn(),
  reportParticipantDisconnected: vi.fn(),
  setLobbyReady: vi.fn(),
  startLobby: vi.fn(),
  updateLobbySelection: vi.fn(),
}));

vi.mock("@/multiplayer/preflightSelection", () => ({
  preflightSelection: vi.fn(),
}));

const formState: LobbyFormState = {
  gameId: "cromagrally",
  mode: "multiplayerRace",
  trackOrLevel: "1",
  maxPlayers: 2,
  tagDurationMinutes: 3,
  displayName: "Tester",
  isPublic: true,
};

const emptyLobbies: readonly MultiplayerLobbySummary[] = [];

function makeLobby(state = "waiting"): MultiplayerLobbyDetails {
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
    state,
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: "2026-01-01T01:00:00Z",
    players: [],
    participantId: "participant-1",
    matchConfig: null,
    matchResult: null,
  };
}

function makeInput(lobby: MultiplayerLobbyDetails | null = null) {
  return {
    lobby,
    formState,
    joinLobbyId: "lobby-1",
    publicLobbies: emptyLobbies,
    chatDraft: "",
    hubClientRef: { current: null },
    runtimeReadyPeersRef: { current: new Set<string>() },
    startNetworkMatchRef: { current: null },
    runtimeStartRequestedRef: { current: false },
    runtimeStartNotifiedRef: { current: false },
    connectHub: vi.fn().mockResolvedValue(undefined),
    closeRtcSessions: vi.fn(),
    setBusy: vi.fn(),
    setErrorText: vi.fn(),
    setUiState: vi.fn(),
    setLobby: vi.fn(),
    setPingMs: vi.fn(),
    setJoinLobbyId: vi.fn(),
    setIsCreateLobbyOpen: vi.fn(),
    setLocalParticipantId: vi.fn(),
    setChatMessages: vi.fn(),
    setChatDraft: vi.fn(),
    setConnectionStatus: vi.fn(),
    setStatusText: vi.fn(),
  };
}

describe("useMultiplayerLobbyActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a lobby after a successful preflight and resets session state", async () => {
    const lobby = makeLobby();
    const input = makeInput();
    vi.mocked(preflightSelection).mockResolvedValueOnce(ok(undefined));
    vi.mocked(createLobby).mockResolvedValueOnce(ok(lobby));

    await useMultiplayerLobbyActions(input).handleCreateLobby();

    expect(createLobby).toHaveBeenCalledWith(formState);
    expect(input.setUiState).toHaveBeenCalledWith("in-lobby");
    expect(input.setLobby).toHaveBeenCalledWith(lobby);
    expect(input.setJoinLobbyId).toHaveBeenCalledWith("lobby-1");
    expect(input.setChatMessages).toHaveBeenCalledWith([]);
    expect(input.setChatDraft).toHaveBeenCalledWith("");
    expect(input.connectHub).toHaveBeenCalledWith(lobby);
    expect(input.setBusy).toHaveBeenLastCalledWith(false);
  });

  it("reports preflight and API failures without connecting", async () => {
    const input = makeInput();
    vi.mocked(preflightSelection).mockResolvedValueOnce(
      err("runtime preload failed"),
    );

    await useMultiplayerLobbyActions(input).handleCreateLobby();

    expect(input.setUiState).toHaveBeenLastCalledWith("preflight-failed");
    expect(input.setErrorText).toHaveBeenCalledWith("runtime preload failed");
    expect(createLobby).not.toHaveBeenCalled();
    expect(input.connectHub).not.toHaveBeenCalled();
    expect(input.setBusy).toHaveBeenLastCalledWith(false);

    vi.mocked(preflightSelection).mockResolvedValueOnce(ok(undefined));
    vi.mocked(createLobby).mockResolvedValueOnce(
      err({ code: "conflict", message: "Lobby is full", status: 409 }),
    );

    await useMultiplayerLobbyActions(input).handleCreateLobby();

    expect(input.setErrorText).toHaveBeenCalledWith("Lobby is full");
    expect(input.connectHub).not.toHaveBeenCalled();
    expect(input.setBusy).toHaveBeenLastCalledWith(false);
  });

  it("rejects quick joins for missing or closed lobbies", async () => {
    const missing = makeInput();
    await useMultiplayerLobbyActions(missing).handleQuickJoinLobby("gone");
    expect(missing.setErrorText).toHaveBeenCalledWith("Lobby no longer exists");
    expect(missing.setUiState).toHaveBeenLastCalledWith("preflight-failed");

    const closedLobby = {
      id: "closed",
      gameId: "cromagrally",
      mode: "multiplayerRace",
      trackOrLevel: "1",
      tagDurationMinutes: 3,
      maxPlayers: 2,
      isPublic: true,
      joinCode: "CLOSED",
      state: "started",
      playerCount: 2,
      createdAt: "2026-01-01T00:00:00Z",
      expiresAt: "2026-01-01T01:00:00Z",
      canJoin: false,
    };
    const closed = makeInput();
    closed.publicLobbies = [closedLobby];
    await useMultiplayerLobbyActions(closed).handleQuickJoinLobby("closed");
    expect(closed.setErrorText).toHaveBeenCalledWith(
      "Lobby is not open for joining.",
    );
    expect(preflightSelection).not.toHaveBeenCalled();
  });

  it("joins after preview and preflight checks, including direct join codes", async () => {
    const lobby = makeLobby();
    const input = makeInput();
    input.joinLobbyId = "abc123";
    input.publicLobbies = [
      {
        id: "lobby-1",
        gameId: "cromagrally",
        mode: "multiplayerRace",
        trackOrLevel: "1",
        tagDurationMinutes: 3,
        maxPlayers: 2,
        isPublic: true,
        joinCode: "ABC123",
        state: "waiting",
        playerCount: 1,
        createdAt: "2026-01-01T00:00:00Z",
        expiresAt: "2026-01-01T01:00:00Z",
        canJoin: true,
      },
    ];
    vi.mocked(getLobbyPreview).mockResolvedValueOnce(
      ok({
        id: "lobby-1",
        gameId: "cromagrally",
        mode: "multiplayerRace",
        trackOrLevel: "1",
        tagDurationMinutes: 3,
        maxPlayers: 2,
        state: "waiting",
        playerCount: 1,
        canJoin: true,
      }),
    );
    vi.mocked(preflightSelection).mockResolvedValueOnce(ok(undefined));
    vi.mocked(joinLobby).mockResolvedValueOnce(ok(lobby));

    await useMultiplayerLobbyActions(input).handleJoinLobby();

    expect(getLobbyPreview).toHaveBeenCalledWith("lobby-1");
    expect(joinLobby).toHaveBeenCalledWith({
      lobbyId: "lobby-1",
      displayName: "Tester",
    });
    expect(input.setUiState).toHaveBeenLastCalledWith("in-lobby");
    expect(input.connectHub).toHaveBeenCalledWith(lobby);
  });

  it("handles ready, selection, start, rematch, and end-match transitions", async () => {
    const lobby = makeLobby();
    const input = makeInput(lobby);
    const actions = useMultiplayerLobbyActions(input);
    const updatedLobby = makeLobby("started");
    vi.mocked(setLobbyReady).mockResolvedValueOnce(ok(updatedLobby));
    await actions.handleSetReady(true);
    expect(setLobbyReady).toHaveBeenCalledWith({ lobbyId: "lobby-1", isReady: true });
    expect(input.setLobby).toHaveBeenCalledWith(updatedLobby);

    vi.mocked(updateLobbySelection).mockResolvedValueOnce(ok(updatedLobby));
    await actions.handleUpdateSelection("multiplayerTag1", "10", 4);
    expect(updateLobbySelection).toHaveBeenCalledWith({
      lobbyId: "lobby-1",
      mode: "multiplayerTag1",
      trackOrLevel: "10",
      tagDurationMinutes: 4,
    });

    vi.mocked(startLobby).mockResolvedValueOnce(ok(updatedLobby));
    await actions.handleStart(false);
    expect(startLobby).toHaveBeenCalledWith({ lobbyId: "lobby-1", force: false });

    const endedLobby = makeLobby("match_ended");
    input.lobby = endedLobby;
    vi.mocked(rematchLobby).mockResolvedValueOnce(ok(updatedLobby));
    await actions.handleStart(true);
    expect(rematchLobby).toHaveBeenCalledWith({
      lobbyId: "lobby-1",
      gameId: "cromagrally",
      mode: "multiplayerRace",
      trackOrLevel: "1",
      tagDurationMinutes: 3,
      force: true,
    });

    vi.mocked(endLobbyMatch).mockResolvedValueOnce(ok(endedLobby));
    await actions.handleEndMatch();
    expect(input.setStatusText).toHaveBeenCalledWith("Match ended by host");
    expect(input.runtimeReadyPeersRef.current).toHaveLength(0);
    expect(input.runtimeStartRequestedRef.current).toBe(false);
  });

  it("cleans up all local session state after leaving", async () => {
    const input = makeInput(makeLobby());
    input.runtimeReadyPeersRef.current.add("peer-2");
    input.runtimeStartRequestedRef.current = true;
    vi.mocked(reportParticipantDisconnected).mockResolvedValueOnce(ok(makeLobby()));
    vi.mocked(leaveLobby).mockResolvedValueOnce(ok(true));

    await useMultiplayerLobbyActions(input).handleLeave();

    expect(reportParticipantDisconnected).toHaveBeenCalledWith("lobby-1", "left lobby");
    expect(leaveLobby).toHaveBeenCalledWith("lobby-1");
    expect(input.closeRtcSessions).toHaveBeenCalled();
    expect(input.setLobby).toHaveBeenCalledWith(null);
    expect(input.setLocalParticipantId).toHaveBeenCalledWith(null);
    expect(input.setConnectionStatus).toHaveBeenCalledWith("disconnected");
    expect(input.setUiState).toHaveBeenCalledWith("disconnected");
    expect(input.runtimeReadyPeersRef.current).toHaveLength(0);
    expect(input.runtimeStartRequestedRef.current).toBe(false);
  });

  it("stops leave cleanup when the leave API fails", async () => {
    const input = makeInput(makeLobby());
    vi.mocked(reportParticipantDisconnected).mockResolvedValueOnce(ok(makeLobby()));
    vi.mocked(leaveLobby).mockResolvedValueOnce(
      err({ code: "network", message: "Leave failed", status: 503 }),
    );

    await useMultiplayerLobbyActions(input).handleLeave();

    expect(input.setErrorText).toHaveBeenCalledWith("Leave failed");
    expect(input.closeRtcSessions).not.toHaveBeenCalled();
    expect(input.setLobby).not.toHaveBeenCalled();
    expect(input.setBusy).toHaveBeenLastCalledWith(false);
  });
});
