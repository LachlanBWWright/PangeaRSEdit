import type { RefObject } from "react";
import {
  createLobby,
  getLobbyPreview,
  joinLobby,
  leaveLobby,
  reportParticipantDisconnected,
  setLobbyReady,
  startLobby,
} from "@/multiplayer/api";
import type { MultiplayerHubClient } from "@/multiplayer/hub";
import { preflightSelection } from "@/multiplayer/preflightSelection";
import type {
  MultiplayerLobbyDetails,
  MultiplayerLobbySummary,
} from "@/multiplayer/types";
import { resolveDirectJoinLobbyId } from "@/multiplayer/menuOptions";
import type { StartNetworkMatchFn } from "@/editor/utils/gamePreviewRuntime";
import type {
  LobbyChatMessage,
  MultiplayerUiState,
} from "./types";
import type { LobbyFormState } from "@/multiplayer/menuOptions";

interface UseMultiplayerLobbyActionsInput {
  readonly lobby: MultiplayerLobbyDetails | null;
  readonly formState: LobbyFormState;
  readonly joinLobbyId: string;
  readonly publicLobbies: readonly MultiplayerLobbySummary[];
  readonly chatDraft: string;
  readonly hubClientRef: RefObject<MultiplayerHubClient | null>;
  readonly runtimeReadyPeersRef: RefObject<Set<string>>;
  readonly startNetworkMatchRef: RefObject<StartNetworkMatchFn | null>;
  readonly runtimeStartRequestedRef: RefObject<boolean>;
  readonly runtimeStartNotifiedRef: RefObject<boolean>;
  readonly connectHub: (nextLobby: MultiplayerLobbyDetails) => Promise<void>;
  readonly closeRtcSessions: () => void;
  readonly setBusy: (busy: boolean) => void;
  readonly setErrorText: (errorText: string | null) => void;
  readonly setUiState: (uiState: MultiplayerUiState) => void;
  readonly setLobby: (lobby: MultiplayerLobbyDetails | null) => void;
  readonly setPingMs: (pingMs: number | null) => void;
  readonly setJoinLobbyId: (joinLobbyId: string) => void;
  readonly setIsCreateLobbyOpen: (isOpen: boolean) => void;
  readonly setLocalParticipantId: (participantId: string | null) => void;
  readonly setChatMessages: (messages: readonly LobbyChatMessage[]) => void;
  readonly setChatDraft: (draft: string) => void;
  readonly setConnectionStatus: (status: string) => void;
  readonly setStatusText: (statusText: string) => void;
}

interface MultiplayerLobbyActions {
  readonly handleCreateLobby: () => Promise<void>;
  readonly handleJoinLobby: () => Promise<void>;
  readonly handleQuickJoinLobby: (lobbyIdToJoin: string) => Promise<void>;
  readonly handleSetReady: (isReady: boolean) => Promise<void>;
  readonly handleStart: (force: boolean) => Promise<void>;
  readonly handleLeave: () => Promise<void>;
  readonly handleRemoveParticipant: (
    targetParticipantId: string,
  ) => Promise<void>;
  readonly handleSendChat: () => Promise<void>;
}

function resetRuntimeStartState(input: UseMultiplayerLobbyActionsInput): void {
  input.runtimeReadyPeersRef.current.clear();
  input.startNetworkMatchRef.current = null;
  input.runtimeStartRequestedRef.current = false;
  input.runtimeStartNotifiedRef.current = false;
}

function resetLobbyChatState(input: UseMultiplayerLobbyActionsInput): void {
  input.setChatMessages([]);
  input.setChatDraft("");
}

async function joinPreflightedLobby(
  input: UseMultiplayerLobbyActionsInput,
  lobbyId: string,
): Promise<void> {
  input.setUiState("joining-lobby");
  const result = await joinLobby({
    lobbyId,
    displayName: input.formState.displayName,
  });
  if (result.isErr()) {
    input.setErrorText(result.error.message);
    input.setBusy(false);
    return;
  }
  input.setLobby(result.value);
  input.setUiState("in-lobby");
  input.setPingMs(null);
  resetLobbyChatState(input);
  await input.connectHub(result.value);
  input.setBusy(false);
}

export function useMultiplayerLobbyActions(
  input: UseMultiplayerLobbyActionsInput,
): MultiplayerLobbyActions {
  const handleCreateLobby = async (): Promise<void> => {
    input.setBusy(true);
    input.setErrorText(null);
    input.setUiState("preloading-game");
    const preflightResult = await preflightSelection(
      input.formState.gameId,
      input.formState.trackOrLevel,
    );
    if (preflightResult.isErr()) {
      input.setErrorText(preflightResult.error);
      input.setUiState("preflight-failed");
      input.setBusy(false);
      return;
    }
    input.setUiState("joining-lobby");
    const result = await createLobby(input.formState);
    if (result.isErr()) {
      input.setErrorText(result.error.message);
      input.setBusy(false);
      return;
    }
    input.setLobby(result.value);
    input.setUiState("in-lobby");
    input.setPingMs(null);
    resetLobbyChatState(input);
    input.setJoinLobbyId(result.value.id);
    input.setIsCreateLobbyOpen(false);
    await input.connectHub(result.value);
    input.setBusy(false);
  };

  const handleJoinLobby = async (): Promise<void> => {
    const resolvedLobbyId = resolveDirectJoinLobbyId(
      input.joinLobbyId,
      input.publicLobbies,
    );
    input.setBusy(true);
    input.setErrorText(null);
    input.setUiState("preloading-game");
    const previewResult = await getLobbyPreview(resolvedLobbyId);
    if (previewResult.isErr()) {
      input.setErrorText(previewResult.error.message);
      input.setUiState("preflight-failed");
      input.setBusy(false);
      return;
    }
    if (!previewResult.value.canJoin) {
      input.setErrorText("Lobby is not open for joining.");
      input.setUiState("preflight-failed");
      input.setBusy(false);
      return;
    }
    const preflightResult = await preflightSelection(
      previewResult.value.gameId,
      previewResult.value.trackOrLevel,
    );
    if (preflightResult.isErr()) {
      input.setErrorText(preflightResult.error);
      input.setUiState("preflight-failed");
      input.setBusy(false);
      return;
    }
    await joinPreflightedLobby(input, resolvedLobbyId);
  };

  const handleQuickJoinLobby = async (
    lobbyIdToJoin: string,
  ): Promise<void> => {
    input.setJoinLobbyId(lobbyIdToJoin);
    input.setBusy(true);
    input.setErrorText(null);
    input.setUiState("preloading-game");
    const lobbySummary = input.publicLobbies.find(
      (item) => item.id === lobbyIdToJoin,
    );
    if (!lobbySummary) {
      input.setErrorText("Lobby no longer exists");
      input.setUiState("preflight-failed");
      input.setBusy(false);
      return;
    }
    if (lobbySummary.canJoin === false) {
      input.setErrorText("Lobby is not open for joining.");
      input.setUiState("preflight-failed");
      input.setBusy(false);
      return;
    }
    const preflightResult = await preflightSelection(
      lobbySummary.gameId,
      lobbySummary.trackOrLevel,
    );
    if (preflightResult.isErr()) {
      input.setErrorText(preflightResult.error);
      input.setUiState("preflight-failed");
      input.setBusy(false);
      return;
    }
    await joinPreflightedLobby(input, lobbyIdToJoin);
  };

  const handleSetReady = async (isReady: boolean): Promise<void> => {
    if (!input.lobby) {
      return;
    }
    input.setBusy(true);
    input.setErrorText(null);
    const result = await setLobbyReady({
      lobbyId: input.lobby.id,
      isReady,
    });
    if (result.isErr()) {
      input.setErrorText(result.error.message);
      input.setBusy(false);
      return;
    }
    input.setLobby(result.value);
    input.setBusy(false);
  };

  const handleStart = async (force: boolean): Promise<void> => {
    if (!input.lobby) {
      return;
    }
    input.setBusy(true);
    input.setErrorText(null);
    const startResult = await startLobby({ lobbyId: input.lobby.id, force });
    if (startResult.isErr()) {
      input.setErrorText(startResult.error.message);
      input.setBusy(false);
      return;
    }
    input.setLobby(startResult.value);
    const hubClient = input.hubClientRef.current;
    if (hubClient) {
      const notifyResult = await hubClient.notifyMatchStarting(input.lobby.id);
      if (notifyResult.isErr()) {
        input.setErrorText(notifyResult.error.message);
      }
    }
    input.setBusy(false);
  };

  const handleLeave = async (): Promise<void> => {
    if (!input.lobby) {
      return;
    }
    input.setBusy(true);
    input.setErrorText(null);
    await reportParticipantDisconnected(input.lobby.id, "left lobby");
    const leaveResult = await leaveLobby(input.lobby.id);
    if (leaveResult.isErr()) {
      input.setErrorText(leaveResult.error.message);
      input.setBusy(false);
      return;
    }

    const hubClient = input.hubClientRef.current;
    if (hubClient) {
      await hubClient.disconnect();
      input.hubClientRef.current = null;
    }
    input.closeRtcSessions();
    input.setLobby(null);
    resetRuntimeStartState(input);
    input.setLocalParticipantId(null);
    input.setPingMs(null);
    resetLobbyChatState(input);
    input.setConnectionStatus("disconnected");
    input.setStatusText("Disconnected");
    input.setUiState("disconnected");
    input.setBusy(false);
  };

  const handleRemoveParticipant = async (
    targetParticipantId: string,
  ): Promise<void> => {
    if (!input.lobby) {
      return;
    }

    const hubClient = input.hubClientRef.current;
    if (!hubClient) {
      input.setErrorText("Not connected to signaling hub");
      return;
    }

    const result = await hubClient.removeParticipant(
      input.lobby.id,
      targetParticipantId,
    );
    if (result.isErr()) {
      input.setErrorText(result.error.message);
      return;
    }

    input.setStatusText("Participant removed");
  };

  const handleSendChat = async (): Promise<void> => {
    if (!input.lobby) {
      return;
    }
    const trimmedMessage = input.chatDraft.trim();
    if (trimmedMessage.length === 0) {
      return;
    }

    const hubClient = input.hubClientRef.current;
    if (!hubClient) {
      input.setErrorText("Not connected to signaling hub");
      return;
    }

    const result = await hubClient.sendLobbyChat(input.lobby.id, trimmedMessage);
    if (result.isErr()) {
      input.setErrorText(result.error.message);
      return;
    }

    input.setChatDraft("");
  };

  return {
    handleCreateLobby,
    handleJoinLobby,
    handleQuickJoinLobby,
    handleSetReady,
    handleStart,
    handleLeave,
    handleRemoveParticipant,
    handleSendChat,
  };
}
