import { useCallback, type MutableRefObject, type RefObject } from "react";
import { Result } from "neverthrow";
import {
  reportDesync,
  reportHostDisconnected,
  reportMatchEnded,
  reportMatchResult,
  reportParticipantDisconnected,
  reportTimeout,
} from "@/multiplayer/api";
import { MultiplayerMatchResultSchema } from "@/multiplayer/schemas";
import { normalizeRuntimeMatchResult } from "@/multiplayer/normalizeRuntimeMatchResult";
import type {
  MultiplayerLobbyDetails,
} from "@/multiplayer/types";
import type { HostSession, HostSessionDataChannel } from "@/multiplayer/webrtc/hostSession";
import type { ClientSession } from "@/multiplayer/webrtc/clientSession";
import {
  createWebRtcRuntimeTransport,
  type WebRtcRuntimeDisruptionEvent,
} from "@/multiplayer/webrtcRuntimeTransport";
import {
  createClientRuntimeTransportGuard,
  createHostRuntimeTransportMultiplexer,
} from "@/multiplayer/runtimeTransportMultiplexer";
import { deriveRuntimeMatchIdPair } from "@/multiplayer/pnetPacket";
import type { MultiplayerUiState } from "./types";
import type {
  MultiplayerRuntimeTransportHandle,
} from "./useMultiplayerGameRuntime";

interface UseMultiplayerRuntimeTransportInput {
  readonly lobbyRef: RefObject<MultiplayerLobbyDetails | null>;
  readonly localParticipantIdRef: RefObject<string | null>;
  readonly hostSessionRef: MutableRefObject<HostSession | null>;
  readonly clientSessionRef: MutableRefObject<ClientSession | null>;
  readonly runtimeTransportRef: MutableRefObject<MultiplayerRuntimeTransportHandle | null>;
  readonly hostRuntimeMuxRef: MutableRefObject<
    ReturnType<typeof createHostRuntimeTransportMultiplexer> | null
  >;
  readonly setRuntimeTransportRevision: (update: (previous: number) => number) => void;
  readonly setErrorText: (errorText: string | null) => void;
  readonly setLobby: (
    lobby:
      | MultiplayerLobbyDetails
      | null
      | ((previous: MultiplayerLobbyDetails | null) => MultiplayerLobbyDetails | null),
  ) => void;
  readonly setStatusText: (statusText: string) => void;
  readonly setRtcStatusText: (statusText: string) => void;
  readonly setUiState: (uiState: MultiplayerUiState) => void;
  readonly stopActiveGame: () => void;
}

export interface MultiplayerRuntimeTransportActions {
  readonly closeRuntimeTransport: () => void;
  readonly bindClientRuntimeDataChannels: (channels: {
    readonly controlChannel: HostSessionDataChannel;
    readonly stateChannel: HostSessionDataChannel;
  }) => void;
  readonly bindHostRuntimeDataChannels: (
    participantId: string,
    channels: {
      readonly controlChannel: HostSessionDataChannel;
      readonly stateChannel: HostSessionDataChannel;
    },
  ) => void;
  readonly closeRtcSessions: () => void;
}

export function useMultiplayerRuntimeTransport(
  input: UseMultiplayerRuntimeTransportInput,
): MultiplayerRuntimeTransportActions {
  const {
    hostSessionRef,
    clientSessionRef,
    runtimeTransportRef,
    hostRuntimeMuxRef,
  } = input;
  const reportRuntimeDisruption = useCallback(
    (event: WebRtcRuntimeDisruptionEvent): void => {
      const activeLobby = input.lobbyRef.current;
      const activeLocalParticipantId = input.localParticipantIdRef.current;
      if (event.type === "packet-gap") {
        input.setStatusText(
          `Sync gap detected (expected ${String(event.expectedSequence)}, got ${String(event.receivedSequence)})`,
        );
        if (activeLobby) {
          void reportDesync(
            activeLobby.id,
            `packet-gap expected=${String(event.expectedSequence)} received=${String(event.receivedSequence)}`,
          );
        }
        return;
      }
      if (event.type === "resend-requested") {
        input.setStatusText(
          `Requesting resend for seq ${String(event.fromSequence)}-${String(event.toSequence)}`,
        );
        return;
      }
      if (event.type === "heartbeat-timeout") {
        input.setStatusText("Network interruption detected; waiting for sync recovery");
        if (activeLobby) {
          void reportTimeout(
            activeLobby.id,
            `heartbeat-timeout elapsedMs=${String(Math.round(event.elapsedMilliseconds))}`,
          );
        }
        return;
      }
      if (event.type === "sync-paused") {
        input.setStatusText(`Network sync paused (${event.reason})`);
        return;
      }
      if (event.type === "sync-resumed") {
        input.setStatusText("Network sync resumed");
        return;
      }
      if (event.type === "peer-disconnected") {
        input.setStatusText("Peer data channel disconnected");
        if (!activeLobby) {
          return;
        }
        const report =
          activeLocalParticipantId &&
          activeLobby.hostParticipantId !== activeLocalParticipantId
            ? reportHostDisconnected
            : reportParticipantDisconnected;
        void report(activeLobby.id, "runtime-peer-disconnected");
      }
    },
    [input],
  );

  const closeRuntimeTransport = useCallback((): void => {
    const active = runtimeTransportRef.current;
    if (!active) {
      hostRuntimeMuxRef.current = null;
      return;
    }
    active.dispose();
    runtimeTransportRef.current = null;
    hostRuntimeMuxRef.current = null;
    input.setRuntimeTransportRevision((previous) => previous + 1);
  }, [hostRuntimeMuxRef, input, runtimeTransportRef]);

  const bindClientRuntimeDataChannels = useCallback(
    (channels: {
      readonly controlChannel: HostSessionDataChannel;
      readonly stateChannel: HostSessionDataChannel;
    }): void => {
      closeRuntimeTransport();
      const nextTransport = createWebRtcRuntimeTransport({
        reliableChannel: channels.controlChannel,
        unreliableChannel: channels.stateChannel,
        isHostAuthority: false,
        onDisruptionEvent: reportRuntimeDisruption,
      });
      const guardedTransport = createClientRuntimeTransportGuard({
        transport: nextTransport.transport,
        expectedHostPlayerIndex:
          input.lobbyRef.current?.matchConfig?.hostPlayerIndex ?? 0,
        expectedMatchIdentity: () => {
          const matchConfig = input.lobbyRef.current?.matchConfig;
          if (!matchConfig) {
            return null;
          }
          const pair = deriveRuntimeMatchIdPair(
            matchConfig.matchId,
            matchConfig.seed,
          );
          return {
            matchIdLow: pair.low,
            matchIdHigh: pair.high,
          };
        },
      });
      runtimeTransportRef.current = {
        transport: guardedTransport,
        dispose: nextTransport.dispose,
      };
      input.setRuntimeTransportRevision((previous) => previous + 1);
    },
    [
      closeRuntimeTransport,
      input,
      reportRuntimeDisruption,
      runtimeTransportRef,
    ],
  );

  const bindHostRuntimeDataChannels = useCallback(
    (
      participantId: string,
      channels: {
        readonly controlChannel: HostSessionDataChannel;
        readonly stateChannel: HostSessionDataChannel;
      },
    ): void => {
      const peerTransport = createWebRtcRuntimeTransport({
        reliableChannel: channels.controlChannel,
        unreliableChannel: channels.stateChannel,
        isHostAuthority: true,
        onDisruptionEvent: reportRuntimeDisruption,
      });
      const existingMux = hostRuntimeMuxRef.current;
      if (existingMux) {
        existingMux.attachPeer(participantId, peerTransport);
        return;
      }
      const createdMux = createHostRuntimeTransportMultiplexer({
        getExpectedPlayerIndexForParticipant: (peerParticipantId) => {
          const activeLobby = input.lobbyRef.current;
          const player = activeLobby?.players.find(
            (entry) => entry.participantId === peerParticipantId,
          );
          return player?.playerIndex ?? null;
        },
        getExpectedMatchIdentity: () => {
          const matchConfig = input.lobbyRef.current?.matchConfig;
          if (!matchConfig) {
            return null;
          }
          const pair = deriveRuntimeMatchIdPair(
            matchConfig.matchId,
            matchConfig.seed,
          );
          return {
            matchIdLow: pair.low,
            matchIdHigh: pair.high,
          };
        },
        reportDesync: (frame, localHash, remoteHash) => {
          const activeLobby = input.lobbyRef.current;
          if (activeLobby) {
            void reportDesync(
              activeLobby.id,
              `runtime-desync frame=${String(frame)} local=${String(localHash)} remote=${String(remoteHash)}`,
            );
          }
        },
        reportMatchEnded: (reason) => {
          const activeLobby = input.lobbyRef.current;
          if (!activeLobby) {
            return;
          }
          input.stopActiveGame();
          void reportMatchEnded(
            activeLobby.id,
            `runtime-match-ended reason=${String(reason)}`,
          ).then((result) => {
            if (result.isErr()) {
              input.setErrorText(result.error.message);
              return;
            }
            input.setLobby(result.value);
            input.setStatusText("Match ended");
            input.setUiState("in-lobby");
          });
        },
        reportMatchResult: (resultJson) => {
          const activeLobby = input.lobbyRef.current;
          const activeParticipantId = input.localParticipantIdRef.current;
          if (
            !activeLobby ||
            activeLobby.hostParticipantId !== activeParticipantId ||
            !activeLobby.matchConfig
          ) {
            return;
          }
          const parsedJson = Result.fromThrowable(
            () => JSON.parse(resultJson) as unknown,
            () => "Failed to parse match result payload.",
          )();
          if (parsedJson.isErr()) {
            return;
          }
          const parsedResult = MultiplayerMatchResultSchema.safeParse(
            parsedJson.value,
          );
          if (!parsedResult.success) {
            return;
          }
          const normalizedResult = normalizeRuntimeMatchResult(
            parsedResult.data,
            activeLobby.matchConfig,
            new Date().toISOString(),
          );
          if (normalizedResult.isErr()) {
            input.setErrorText(normalizedResult.error);
            return;
          }
          void reportMatchResult(activeLobby.id, normalizedResult.value).then(
            (result) => {
              if (result.isOk()) {
                input.setLobby(result.value);
                input.setStatusText("Match results received");
              }
            },
          );
        },
      });
      createdMux.attachPeer(participantId, peerTransport);
      hostRuntimeMuxRef.current = createdMux;
      runtimeTransportRef.current = {
        transport: createdMux.transport,
        dispose: createdMux.dispose,
      };
      input.setRuntimeTransportRevision((previous) => previous + 1);
    },
    [
      hostRuntimeMuxRef,
      input,
      reportRuntimeDisruption,
      runtimeTransportRef,
    ],
  );

  const closeRtcSessions = useCallback((): void => {
    hostSessionRef.current?.closeAll();
    hostSessionRef.current = null;
    clientSessionRef.current?.close();
    clientSessionRef.current = null;
    closeRuntimeTransport();
    input.setRtcStatusText("idle");
    input.setUiState("disconnected");
  }, [
    clientSessionRef,
    closeRuntimeTransport,
    hostSessionRef,
    input,
  ]);

  return {
    closeRuntimeTransport,
    bindClientRuntimeDataChannels,
    bindHostRuntimeDataChannels,
    closeRtcSessions,
  };
}
