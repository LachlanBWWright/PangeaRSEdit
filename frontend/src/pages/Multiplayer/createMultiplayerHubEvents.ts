import type { ResultAsync } from "neverthrow";
import type { MutableRefObject, RefObject } from "react";
import type {
  MultiplayerHubClient,
  MultiplayerHubEvents,
} from "@/multiplayer/hub";
import type {
  MultiplayerLobbyDetails,
} from "@/multiplayer/types";
import type { StartNetworkMatchFn } from "@/editor/utils/gamePreviewRuntime";
import type { LobbyChatMessage, MultiplayerUiState } from "./types";
import type { HostSession } from "@/multiplayer/webrtc/hostSession";
import type { ClientSession } from "@/multiplayer/webrtc/clientSession";
import type { createHostRuntimeTransportMultiplexer } from "@/multiplayer/runtimeTransportMultiplexer";
import { updateLobbyWithReadyChange } from "@/multiplayer/lobbyState";

export interface CreateMultiplayerHubEventsInput {
  readonly nextLobby: MultiplayerLobbyDetails;
  readonly participantId: string;
  readonly hostSessionRef: MutableRefObject<HostSession | null>;
  readonly clientSessionRef: MutableRefObject<ClientSession | null>;
  readonly hostRuntimeMuxRef: MutableRefObject<
    ReturnType<typeof createHostRuntimeTransportMultiplexer> | null
  >;
  readonly lobbyRef: RefObject<MultiplayerLobbyDetails | null>;
  readonly localParticipantIdRef: RefObject<string | null>;
  readonly hubClientRef: MutableRefObject<MultiplayerHubClient | null>;
  readonly runtimeReadyPeersRef: MutableRefObject<Set<string>>;
  readonly startNetworkMatchRef: MutableRefObject<StartNetworkMatchFn | null>;
  readonly runtimeStartRequestedRef: MutableRefObject<boolean>;
  readonly runtimeStartNotifiedRef: MutableRefObject<boolean>;
  readonly setStatusText: (statusText: string) => void;
  readonly setErrorText: (errorText: string | null) => void;
  readonly setLobby: (
    lobby:
      | MultiplayerLobbyDetails
      | null
      | ((previous: MultiplayerLobbyDetails | null) => MultiplayerLobbyDetails | null),
  ) => void;
  readonly setUiState: (uiState: MultiplayerUiState) => void;
  readonly setLocalParticipantId: (participantId: string | null) => void;
  readonly setPingMs: (pingMs: number | null) => void;
  readonly setChatMessages: (
    messages:
      | readonly LobbyChatMessage[]
      | ((previous: readonly LobbyChatMessage[]) => readonly LobbyChatMessage[]),
  ) => void;
  readonly resetLobbyChatState: () => void;
  readonly closeRuntimeTransport: () => void;
  readonly observeRtcResult: (
    result: ResultAsync<void, string>,
    fallbackMessage: string,
  ) => void;
}

function resetRuntimeStartState(
  input: CreateMultiplayerHubEventsInput,
): void {
  input.runtimeReadyPeersRef.current.clear();
  input.startNetworkMatchRef.current = null;
  input.runtimeStartRequestedRef.current = false;
  input.runtimeStartNotifiedRef.current = false;
}

export function createMultiplayerHubEvents(
  input: CreateMultiplayerHubEventsInput,
): Partial<MultiplayerHubEvents> {
  return {
    onPeerJoined: (peerParticipantId) => {
      input.setStatusText(`Peer joined: ${peerParticipantId}`);
      const hostSession = input.hostSessionRef.current;
      if (hostSession) {
        input.observeRtcResult(
          hostSession.startPeer(peerParticipantId),
          "Unable to reconnect peer",
        );
      }
    },
    onPeerDisconnected: (peerParticipantId) => {
      input.setStatusText(`Peer disconnected: ${peerParticipantId}`);
      input.hostSessionRef.current?.closePeer(peerParticipantId);
      input.hostRuntimeMuxRef.current?.detachPeer(peerParticipantId);
      if (!input.hostSessionRef.current) {
        input.closeRuntimeTransport();
      }
    },
    onHostDisconnected: (peerParticipantId) => {
      input.setStatusText(`Host disconnected: ${peerParticipantId}`);
    },
    onParticipantDisconnected: (peerParticipantId) => {
      input.setStatusText(`Participant disconnected: ${peerParticipantId}`);
      input.hostSessionRef.current?.closePeer(peerParticipantId);
      input.hostRuntimeMuxRef.current?.detachPeer(peerParticipantId);
    },
    onReceiveOffer: (fromId, targetId, sdp) => {
      if (targetId !== input.participantId) {
        return;
      }
      const clientSession = input.clientSessionRef.current;
      if (clientSession) {
        input.observeRtcResult(
          clientSession.receiveOffer(fromId, sdp),
          "Unable to accept WebRTC offer",
        );
      }
    },
    onReceiveAnswer: (fromId, targetId, sdp) => {
      if (targetId !== input.participantId) {
        return;
      }
      const hostSession = input.hostSessionRef.current;
      if (hostSession) {
        input.observeRtcResult(
          hostSession.applyAnswer(fromId, sdp),
          "Unable to apply WebRTC answer",
        );
      }
    },
    onReceiveIceCandidate: (fromId, targetId, candidate) => {
      if (targetId !== input.participantId) {
        return;
      }
      const hostSession = input.hostSessionRef.current;
      if (hostSession) {
        input.observeRtcResult(
          hostSession.applyIceCandidate(fromId, candidate),
          "Unable to apply host ICE candidate",
        );
        return;
      }
      const clientSession = input.clientSessionRef.current;
      if (clientSession) {
        input.observeRtcResult(
          clientSession.applyIceCandidate(candidate),
          "Unable to apply client ICE candidate",
        );
      }
    },
    onPlayerReadyChanged: (peerParticipantId, isReady, updatedLobby) => {
      input.setLobby(
        updateLobbyWithReadyChange(updatedLobby, peerParticipantId, isReady),
      );
    },
    onMatchStarting: (_, matchConfig) => {
      resetRuntimeStartState(input);
      input.setLobby((previousLobby) =>
        previousLobby
          ? { ...previousLobby, state: "started", matchConfig }
          : previousLobby,
      );
      input.setUiState("loading-runtime");
      input.setStatusText("Loading runtime…");
    },
    onLobbyParticipantsChanged: (updatedLobby) => {
      input.setLobby(updatedLobby);
    },
    onRemovedFromLobby: (removedLobbyId, removedParticipantId) => {
      if (
        removedLobbyId !== input.nextLobby.id ||
        removedParticipantId !== input.participantId
      ) {
        return;
      }
      input.setStatusText("You were removed by the host");
      input.setLobby(null);
      resetRuntimeStartState(input);
      input.setLocalParticipantId(null);
      input.setPingMs(null);
      input.resetLobbyChatState();
    },
    onLobbyChatMessage: (
      receivedLobbyId,
      messageParticipantId,
      messageDisplayName,
      message,
      createdAt,
    ) => {
      input.setChatMessages((previous) => [
        ...previous,
        {
          lobbyId: receivedLobbyId,
          participantId: messageParticipantId,
          displayName: messageDisplayName,
          message,
          createdAt,
        },
      ]);
    },
    onRuntimeLevelReady: (runtimeLobbyId, readyParticipantId) => {
      const activeLobby = input.lobbyRef.current;
      const activeParticipantId = input.localParticipantIdRef.current;
      if (!activeLobby || runtimeLobbyId !== activeLobby.id) {
        return;
      }
      input.runtimeReadyPeersRef.current.add(readyParticipantId);
      const isLocalHost =
        Boolean(activeParticipantId) &&
        activeLobby.hostParticipantId === activeParticipantId;
      if (!isLocalHost) {
        input.setUiState("waiting-for-host-start");
        input.setStatusText("Waiting for host to start match…");
        return;
      }
      const allParticipantsReady = activeLobby.players.every((player) =>
        input.runtimeReadyPeersRef.current.has(player.participantId),
      );
      if (!allParticipantsReady) {
        input.setUiState("waiting-for-peer-runtime");
        input.setStatusText("Waiting for peers to finish runtime load…");
        return;
      }
      const hubClient = input.hubClientRef.current;
      if (hubClient && !input.runtimeStartNotifiedRef.current) {
        input.runtimeStartNotifiedRef.current = true;
        void hubClient.notifyRuntimeStartNow(activeLobby.id);
      }
    },
    onRuntimeStartNow: (runtimeLobbyId) => {
      const activeLobby = input.lobbyRef.current;
      if (!activeLobby || runtimeLobbyId !== activeLobby.id) {
        return;
      }
      const startNetworkMatch = input.startNetworkMatchRef.current;
      if (!startNetworkMatch) {
        input.runtimeStartRequestedRef.current = true;
        return;
      }
      const started = startNetworkMatch();
      if (started.isErr()) {
        input.setErrorText(started.error);
        input.setUiState("disconnected");
        return;
      }
      input.setUiState("running");
      input.setStatusText("Match started");
    },
  };
}
