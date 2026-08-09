import { useCallback, useEffect, useRef, useState } from "react";
import { Result, errAsync, okAsync, type Result as NtResult } from "neverthrow";
import {
  createAndConnectHubClient,
  type MultiplayerHubClient,
  type MultiplayerHubEvents,
} from "@/multiplayer/hub";
import {
  heartbeatLobby,
  listLobbies,
  reportDesync,
  reportMatchEnded,
  reportMatchResult,
  reportHostDisconnected,
  reportParticipantDisconnected,
  reportTimeout,
} from "@/multiplayer/api";
import { MultiplayerMatchResultSchema } from "@/multiplayer/schemas";
import { createMockRuntimeTransport } from "@/multiplayer/mockRuntimeTransport";
import type {
  MultiplayerLobbyDetails,
  MultiplayerMatchConfig,
  MultiplayerLobbySummary,
} from "@/multiplayer/types";
import { startGamePreview } from "@/editor/utils/gamePreviewHostRuntime";
import { fetchIceServers } from "@/multiplayer/webrtc/iceServers";
import { createPeerConnection } from "@/multiplayer/webrtc/createPeerConnection";
import {
  createHostSession,
  type HostSession,
  type HostSessionDataChannel,
} from "@/multiplayer/webrtc/hostSession";
import {
  createClientSession,
  type ClientSession,
} from "@/multiplayer/webrtc/clientSession";
import { observeRtcResult } from "@/multiplayer/webrtc/observeRtcResult";
import {
  createWebRtcRuntimeTransport,
  type WebRtcRuntimeDisruptionEvent,
} from "@/multiplayer/webrtcRuntimeTransport";
import {
  createClientRuntimeTransportGuard,
  createHostRuntimeTransportMultiplexer,
} from "@/multiplayer/runtimeTransportMultiplexer";
import { deriveRuntimeMatchIdPair } from "@/multiplayer/pnetPacket";
import { validateRuntimeCompatibility } from "@/multiplayer/runtimeCompatibility";
import type { StartNetworkMatchFn } from "@/editor/utils/gamePreviewRuntime";
import { LobbyBrowser } from "./Multiplayer/LobbyBrowser";
import { MultiplayerSessionView } from "./Multiplayer/MultiplayerSessionView";
import type {
  LobbyChatMessage,
  MultiplayerUiState,
} from "./Multiplayer/types";
import { useMultiplayerLobbyActions } from "./Multiplayer/useMultiplayerLobbyActions";
import { countReadyPlayers } from "@/multiplayer/lobbyDisplay";
import {
  defaultLobbyFormState,
  filterPublicLobbies,
  type JoinGameFilter,
  type JoinModeFilter,
  type LobbyFormState,
} from "@/multiplayer/menuOptions";
import {
  buildHudModel,
  deriveDisplayedMatchPhase,
  deriveMatchKind,
} from "@/multiplayer/matchState";
import {
  resolveMultiplayerLaunchSpec,
  resolveMultiplayerLaunchSpecFromSelection,
} from "@/multiplayer/launchSpec";
import { preloadGameRuntimeAssets } from "@/multiplayer/runtimeAssetPreload";
import {
  getConnectionStatus,
  updateLobbyWithReadyChange,
} from "@/multiplayer/lobbyState";
import {
  shouldForceLocalTransport,
  shouldShowDebugOverlay,
  shouldUseMockHub,
} from "@/multiplayer/browserFlags";
import { useMultiplayerDebugTelemetry } from "./Multiplayer/useMultiplayerDebugTelemetry";

export function MultiplayerPage() {
  const RUNTIME_PROTOCOL_VERSION = 1;
  const RUNTIME_COMPAT_VERSION = "host-authoritative-v2";
  const RUNTIME_CONTENT_HASH =
    import.meta.env.VITE_MULTIPLAYER_CONTENT_HASH ?? "development-unpinned";
  const [isCreateLobbyOpen, setIsCreateLobbyOpen] = useState(false);
  const [formState, setFormState] = useState<LobbyFormState>(
    defaultLobbyFormState,
  );
  const [joinGameFilter, setJoinGameFilter] = useState<JoinGameFilter>("all");
  const [joinModeFilter, setJoinModeFilter] = useState<JoinModeFilter>("all");
  const [joinLobbyId, setJoinLobbyId] = useState("");
  const [publicLobbies, setPublicLobbies] = useState<
    readonly MultiplayerLobbySummary[]
  >([]);
  const [lobby, setLobby] = useState<MultiplayerLobbyDetails | null>(null);
  const [chatMessages, setChatMessages] = useState<readonly LobbyChatMessage[]>(
    [],
  );
  const [chatDraft, setChatDraft] = useState("");
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [localParticipantId, setLocalParticipantId] = useState<string | null>(
    null,
  );
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [statusText, setStatusText] = useState("Not connected");
  const [uiState, setUiState] = useState<MultiplayerUiState>("idle");
  const [packetCounts] = useState<Record<string, number>>({
    hello: 0,
    helloAck: 0,
    loadReady: 0,
    startCountdown: 0,
    clientInput: 0,
    hostInputBundle: 0,
    pauseRequest: 0,
    resumeRequest: 0,
    disconnectNotice: 0,
    desyncReport: 0,
    matchEnd: 0,
  });
  const [errorText, setErrorText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lobbyListErrorText, setLobbyListErrorText] = useState<string | null>(
    null,
  );
  const [runtimeTransportRevision, setRuntimeTransportRevision] = useState(0);
  const [rtcStatusText, setRtcStatusText] = useState("idle");
  const [forceLocalRuntimeTransport, setForceLocalRuntimeTransport] =
    useState(false);
  const hubClientRef = useRef<MultiplayerHubClient | null>(null);
  const hostSessionRef = useRef<HostSession | null>(null);
  const clientSessionRef = useRef<ClientSession | null>(null);
  const runtimeTransportRef = useRef<{
    readonly transport: {
      readonly sendReliable: (bytes: ArrayBuffer) => NtResult<void, string>;
      readonly sendUnreliable: (bytes: ArrayBuffer) => NtResult<void, string>;
      readonly reportDesync: (
        frame: number,
        localHash: number,
        remoteHash: number,
      ) => void;
      readonly reportMatchEnded: (reason: number) => void;
      readonly reportMatchResult?: (resultJson: string) => void;
      readonly subscribeIncoming: (
        onPacket: (bytes: ArrayBuffer) => void,
      ) => () => void;
    };
    readonly dispose: () => void;
  } | null>(null);
  const hostRuntimeMuxRef = useRef<ReturnType<
    typeof createHostRuntimeTransportMultiplexer
  > | null>(null);
  const lobbyRef = useRef<MultiplayerLobbyDetails | null>(null);
  const localParticipantIdRef = useRef<string | null>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopGameRef = useRef<(() => void) | null>(null);
  const runTokenRef = useRef(0);
  const preloadedRuntimeKeysRef = useRef<Set<string>>(new Set());
  const runtimeReadyPeersRef = useRef<Set<string>>(new Set());
  const startNetworkMatchRef = useRef<StartNetworkMatchFn | null>(null);
  const runtimeStartRequestedRef = useRef(false);
  const runtimeStartNotifiedRef = useRef(false);

  const stopActiveGame = useCallback((): void => {
    const stopGame = stopGameRef.current;
    if (!stopGame) {
      return;
    }
    stopGame();
    stopGameRef.current = null;
  }, []);

  const resetLobbyChatState = (): void => {
    setChatMessages([]);
    setChatDraft("");
  };

  useEffect(() => {
    lobbyRef.current = lobby;
  }, [lobby]);

  useEffect(() => {
    localParticipantIdRef.current = localParticipantId;
  }, [localParticipantId]);

  const closeRuntimeTransport = useCallback((): void => {
    const active = runtimeTransportRef.current;
    if (!active) {
      hostRuntimeMuxRef.current = null;
      return;
    }
    active.dispose();
    runtimeTransportRef.current = null;
    hostRuntimeMuxRef.current = null;
    setRuntimeTransportRevision((previous) => previous + 1);
  }, []);

  const reportRuntimeDisruption = (
    event: WebRtcRuntimeDisruptionEvent,
  ): void => {
    const activeLobby = lobbyRef.current;
    const activeLocalParticipantId = localParticipantIdRef.current;

    if (event.type === "packet-gap") {
      setStatusText(
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
      setStatusText(
        `Requesting resend for seq ${String(event.fromSequence)}-${String(event.toSequence)}`,
      );
      return;
    }

    if (event.type === "heartbeat-timeout") {
      setStatusText("Network interruption detected; waiting for sync recovery");
      if (activeLobby) {
        void reportTimeout(
          activeLobby.id,
          `heartbeat-timeout elapsedMs=${String(Math.round(event.elapsedMilliseconds))}`,
        );
      }
      return;
    }

    if (event.type === "sync-paused") {
      setStatusText(`Network sync paused (${event.reason})`);
      return;
    }

    if (event.type === "sync-resumed") {
      setStatusText("Network sync resumed");
      return;
    }

    if (event.type === "peer-disconnected") {
      setStatusText("Peer data channel disconnected");
      if (activeLobby) {
        if (
          activeLocalParticipantId &&
          activeLobby.hostParticipantId !== activeLocalParticipantId
        ) {
          void reportHostDisconnected(
            activeLobby.id,
            "runtime-peer-disconnected",
          );
        } else {
          void reportParticipantDisconnected(
            activeLobby.id,
            "runtime-peer-disconnected",
          );
        }
      }
    }
  };

  const bindClientRuntimeDataChannels = (channels: {
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
        lobbyRef.current?.matchConfig?.hostPlayerIndex ?? 0,
      expectedMatchIdentity: () => {
        const activeLobby = lobbyRef.current;
        const matchConfig = activeLobby?.matchConfig;
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
    setRuntimeTransportRevision((previous) => previous + 1);
  };

  const bindHostRuntimeDataChannels = (
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
        const activeLobby = lobbyRef.current;
        if (!activeLobby) {
          return null;
        }
        const player = activeLobby.players.find(
          (entry) => entry.participantId === peerParticipantId,
        );
        return player?.playerIndex ?? null;
      },
      getExpectedMatchIdentity: () => {
        const activeLobby = lobbyRef.current;
        const matchConfig = activeLobby?.matchConfig;
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
        const activeLobby = lobbyRef.current;
        if (!activeLobby) {
          return;
        }
        void reportDesync(
          activeLobby.id,
          `runtime-desync frame=${String(frame)} local=${String(localHash)} remote=${String(remoteHash)}`,
        );
      },
      reportMatchEnded: (reason) => {
        const activeLobby = lobbyRef.current;
        if (!activeLobby) {
          return;
        }
        stopActiveGame();
        void reportMatchEnded(
          activeLobby.id,
          `runtime-match-ended reason=${String(reason)}`,
        ).then((result) => {
          if (result.isErr()) {
            setErrorText(result.error.message);
            return;
          }
          setLobby(result.value);
          setStatusText("Match ended");
          setUiState("in-lobby");
        });
      },
      reportMatchResult: (resultJson) => {
        const activeLobby = lobbyRef.current;
        const activeParticipantId = localParticipantIdRef.current;
        if (!activeLobby) {
          return;
        }
        if (activeLobby.hostParticipantId !== activeParticipantId) {
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
        void reportMatchResult(activeLobby.id, parsedResult.data).then(
          (result) => {
            if (result.isOk()) {
              setLobby(result.value);
              setStatusText("Match results received");
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
    setRuntimeTransportRevision((previous) => previous + 1);
  };

  const closeRtcSessions = useCallback((): void => {
    hostSessionRef.current?.closeAll();
    hostSessionRef.current = null;
    clientSessionRef.current?.close();
    clientSessionRef.current = null;
    closeRuntimeTransport();
    setRtcStatusText("idle");
    setUiState("disconnected");
  }, [closeRuntimeTransport]);

  useEffect(() => {
    return () => {
      const client = hubClientRef.current;
      if (!client) {
        closeRtcSessions();
      } else {
        void client.disconnect();
      }

      closeRtcSessions();
      stopActiveGame();
    };
  }, [closeRtcSessions, stopActiveGame]);

  const lobbyId = lobby?.id ?? null;

  useEffect(() => {
    if (!lobby || lobby.state === "started") {
      return;
    }

    const preloadSpec = resolveMultiplayerLaunchSpecFromSelection(
      lobby.gameId,
      lobby.trackOrLevel,
    );
    if (!preloadSpec) {
      return;
    }

    const preloadKey = `lobby:${lobby.id}:${lobby.gameId}:${lobby.trackOrLevel}`;
    if (preloadedRuntimeKeysRef.current.has(preloadKey)) {
      return;
    }

    preloadedRuntimeKeysRef.current.add(preloadKey);
    void preloadGameRuntimeAssets(preloadSpec.config).then(() => {
      setStatusText("Game assets preloaded; ready to start");
    });
  }, [lobby]);

  useEffect(() => {
    if (!lobbyId) {
      return;
    }
    const intervalId = window.setInterval(() => {
      void heartbeatLobby(lobbyId).then((result) => {
        if (result.isOk()) {
          setLobby(result.value);
        }
      });
    }, 15_000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [lobbyId]);

  const loadPublicLobbies = useCallback((): void => {
    const listInput =
      joinGameFilter === "all" ? {} : { gameId: joinGameFilter };
    void listLobbies(listInput).then((result) => {
      if (result.isErr()) {
        setLobbyListErrorText(result.error.message);
        return;
      }
      setLobbyListErrorText(null);
      setPublicLobbies(result.value);
    });
  }, [joinGameFilter]);

  useEffect(() => {
    if (lobby) {
      return;
    }

    loadPublicLobbies();
    const intervalId = window.setInterval(loadPublicLobbies, 5000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadPublicLobbies, lobby]);

  useEffect(() => {
    if (!lobby || !hubClientRef.current || !localParticipantId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const startedAt = Date.now();
      void hubClientRef.current
        ?.ping(startedAt)
        .andThen(() => {
          const measured = Date.now() - startedAt;
          setPingMs(measured);
          return (
            hubClientRef.current?.reportPing(lobby.id, measured) ??
            okAsync(undefined)
          );
        })
        .orElse(() => okAsync(undefined));
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [lobby, localParticipantId]);

  const connectHub = async (
    nextLobby: MultiplayerLobbyDetails,
  ): Promise<void> => {
    closeRtcSessions();
    setUiState("connecting-peer");
    setForceLocalRuntimeTransport(shouldForceLocalTransport());
    const participantId = nextLobby.participantId;
    setLocalParticipantId(participantId);
    if (shouldUseMockHub()) {
      setConnectionStatus("connected");
      setStatusText("Connected (mock hub)");
      setRtcStatusText("mock");
      setUiState("in-lobby");
      return;
    }

    setRtcStatusText("connecting");

    const iceServersResult = await fetchIceServers(nextLobby.id);
    const defaultIceServers: readonly RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
    ];
    const iceServers =
      iceServersResult.isOk() && iceServersResult.value.length > 0
        ? iceServersResult.value
        : defaultIceServers;
    const canUseWebRtc = !shouldForceLocalTransport();

    if (iceServersResult.isErr()) {
      setStatusText("ICE endpoint unavailable, using default STUN");
    }

    if (shouldForceLocalTransport()) {
      setRtcStatusText("fallback-local");
      setStatusText("Using local fallback transport");
    }

    const events: Partial<MultiplayerHubEvents> = {
      onPeerJoined: (peerParticipantId) => {
        setStatusText(`Peer joined: ${peerParticipantId}`);
        const hostSession = hostSessionRef.current;
        if (hostSession) {
          observeRtcResult(
            hostSession.startPeer(peerParticipantId),
            "Unable to reconnect peer",
            setErrorText,
          );
        }
      },
      onPeerDisconnected: (peerParticipantId) => {
        setStatusText(`Peer disconnected: ${peerParticipantId}`);
        hostSessionRef.current?.closePeer(peerParticipantId);
        hostRuntimeMuxRef.current?.detachPeer(peerParticipantId);
        if (!hostSessionRef.current) {
          closeRuntimeTransport();
        }
      },
      onHostDisconnected: (peerParticipantId) => {
        setStatusText(`Host disconnected: ${peerParticipantId}`);
      },
      onParticipantDisconnected: (peerParticipantId) => {
        setStatusText(`Participant disconnected: ${peerParticipantId}`);
        hostSessionRef.current?.closePeer(peerParticipantId);
        hostRuntimeMuxRef.current?.detachPeer(peerParticipantId);
      },
      onReceiveOffer: (fromId, targetId, sdp) => {
        if (targetId !== participantId) {
          return;
        }
        const clientSession = clientSessionRef.current;
        if (!clientSession) {
          return;
        }
        observeRtcResult(
          clientSession.receiveOffer(fromId, sdp),
          "Unable to accept WebRTC offer",
          setErrorText,
        );
      },
      onReceiveAnswer: (fromId, targetId, sdp) => {
        if (targetId !== participantId) {
          return;
        }
        const hostSession = hostSessionRef.current;
        if (!hostSession) {
          return;
        }
        observeRtcResult(
          hostSession.applyAnswer(fromId, sdp),
          "Unable to apply WebRTC answer",
          setErrorText,
        );
      },
      onReceiveIceCandidate: (fromId, targetId, candidate) => {
        if (targetId !== participantId) {
          return;
        }
        const hostSession = hostSessionRef.current;
        if (hostSession) {
          observeRtcResult(
            hostSession.applyIceCandidate(fromId, candidate),
            "Unable to apply host ICE candidate",
            setErrorText,
          );
          return;
        }
        const clientSession = clientSessionRef.current;
        if (!clientSession) {
          return;
        }
        observeRtcResult(
          clientSession.applyIceCandidate(candidate),
          "Unable to apply client ICE candidate",
          setErrorText,
        );
      },
      onPlayerReadyChanged: (peerParticipantId, isReady, updatedLobby) => {
        setLobby(
          updateLobbyWithReadyChange(updatedLobby, peerParticipantId, isReady),
        );
      },
      onMatchStarting: (_, matchConfig) => {
        runtimeReadyPeersRef.current.clear();
        startNetworkMatchRef.current = null;
        runtimeStartRequestedRef.current = false;
        runtimeStartNotifiedRef.current = false;
        setLobby((previousLobby) =>
          previousLobby
            ? {
                ...previousLobby,
                state: "started",
                matchConfig,
              }
            : previousLobby,
        );
        setUiState("loading-runtime");
        setStatusText("Loading runtime…");
      },
      onLobbyParticipantsChanged: (updatedLobby) => {
        setLobby(updatedLobby);
      },
      onRemovedFromLobby: (removedLobbyId, removedParticipantId) => {
        if (
          removedLobbyId !== nextLobby.id ||
          removedParticipantId !== participantId
        ) {
          return;
        }
        setStatusText("You were removed by the host");
        setLobby(null);
        runtimeReadyPeersRef.current.clear();
        startNetworkMatchRef.current = null;
        runtimeStartRequestedRef.current = false;
        runtimeStartNotifiedRef.current = false;
        setLocalParticipantId(null);
        setPingMs(null);
        resetLobbyChatState();
      },
      onLobbyChatMessage: (
        receivedLobbyId,
        messageParticipantId,
        messageDisplayName,
        message,
        createdAt,
      ) => {
        setChatMessages((previous) => [
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
        const activeLobby = lobbyRef.current;
        const activeParticipantId = localParticipantIdRef.current;
        if (!activeLobby || runtimeLobbyId !== activeLobby.id) {
          return;
        }
        runtimeReadyPeersRef.current.add(readyParticipantId);
        const isLocalHost =
          Boolean(activeParticipantId) &&
          activeLobby.hostParticipantId === activeParticipantId;
        if (!isLocalHost) {
          setUiState("waiting-for-host-start");
          setStatusText("Waiting for host to start match…");
          return;
        }
        const allParticipantsReady = activeLobby.players.every((player) =>
          runtimeReadyPeersRef.current.has(player.participantId),
        );
        if (!allParticipantsReady) {
          setUiState("waiting-for-peer-runtime");
          setStatusText("Waiting for peers to finish runtime load…");
          return;
        }
        const hubClient = hubClientRef.current;
        if (hubClient && !runtimeStartNotifiedRef.current) {
          runtimeStartNotifiedRef.current = true;
          void hubClient.notifyRuntimeStartNow(activeLobby.id);
        }
      },
      onRuntimeStartNow: (runtimeLobbyId) => {
        const activeLobby = lobbyRef.current;
        if (!activeLobby || runtimeLobbyId !== activeLobby.id) {
          return;
        }
        const startNetworkMatch = startNetworkMatchRef.current;
        if (!startNetworkMatch) {
          runtimeStartRequestedRef.current = true;
          return;
        }
        const started = startNetworkMatch();
        if (started.isErr()) {
          setErrorText(started.error);
          setUiState("disconnected");
          return;
        }
        setUiState("running");
        setStatusText("Match started");
      },
    };

    const existing = hubClientRef.current;
    if (existing) {
      await existing.disconnect();
      hubClientRef.current = null;
    }

    const connectResult = await createAndConnectHubClient(
      nextLobby.id,
      participantId,
      events,
    );
    if (connectResult.isErr()) {
      setErrorText(connectResult.error.message);
      setStatusText("Connection failed");
      return;
    }

    hubClientRef.current = connectResult.value;
    setConnectionStatus(getConnectionStatus(connectResult.value));
    setStatusText("Connected");
    setUiState("in-lobby");

    if (!canUseWebRtc) {
      return;
    }

    const isLocalHost = nextLobby.hostParticipantId === participantId;
    const createConnectionForHost = (peerParticipantId: string) => {
      void peerParticipantId;
      const created = createPeerConnection(iceServers);
      if (created.isErr()) {
        return errAsync(created.error);
      }
      return okAsync(created.value);
    };
    const createConnectionForClient = () => {
      const created = createPeerConnection(iceServers);
      if (created.isErr()) {
        return errAsync(created.error);
      }
      return okAsync(created.value);
    };

    if (isLocalHost) {
      hostSessionRef.current = createHostSession({
        createPeerConnection: createConnectionForHost,
        sendOffer: (targetParticipantId, sdp) =>
          connectResult.value
            .sendOffer(nextLobby.id, targetParticipantId, sdp)
            .mapErr((error) => error.message),
        sendIceCandidate: (targetParticipantId, candidate) =>
          connectResult.value
            .sendIceCandidate(nextLobby.id, targetParticipantId, candidate)
            .mapErr((error) => error.message),
        onStateChanged: (_, state) => {
          setRtcStatusText(state);
          if (state === "failed") {
            setForceLocalRuntimeTransport(true);
            setStatusText(
              "WebRTC failed, switched to local fallback transport",
            );
          }
        },
        onError: setErrorText,
        onDataChannelOpened: (peerParticipantId, channels) => {
          bindHostRuntimeDataChannels(peerParticipantId, channels);
          setRtcStatusText("connected");
        },
      });

      for (const player of nextLobby.players) {
        if (player.participantId === participantId) {
          continue;
        }
        observeRtcResult(
          hostSessionRef.current.startPeer(player.participantId),
          "Unable to connect peer",
          setErrorText,
        );
      }
    } else {
      clientSessionRef.current = createClientSession({
        createPeerConnection: createConnectionForClient,
        sendAnswer: (targetParticipantId, sdp) =>
          connectResult.value
            .sendAnswer(nextLobby.id, targetParticipantId, sdp)
            .mapErr((error) => error.message),
        sendIceCandidate: (targetParticipantId, candidate) =>
          connectResult.value
            .sendIceCandidate(nextLobby.id, targetParticipantId, candidate)
            .mapErr((error) => error.message),
        onStateChanged: (state) => {
          setRtcStatusText(state);
          if (state === "failed") {
            setForceLocalRuntimeTransport(true);
            setStatusText(
              "WebRTC failed, switched to local fallback transport",
            );
          }
        },
        onError: setErrorText,
        onDataChannelOpened: (channels) => {
          bindClientRuntimeDataChannels(channels);
          setRtcStatusText("connected");
        },
      });
    }
  };

  const {
    handleCreateLobby,
    handleJoinLobby,
    handleQuickJoinLobby,
    handleSetReady,
    handleStart,
    handleUpdateSelection,
    handleEndMatch,
    handleLeave,
    handleRemoveParticipant,
    handleSendChat,
  } = useMultiplayerLobbyActions({
    lobby,
    formState,
    joinLobbyId,
    publicLobbies,
    chatDraft,
    hubClientRef,
    runtimeReadyPeersRef,
    startNetworkMatchRef,
    runtimeStartRequestedRef,
    runtimeStartNotifiedRef,
    connectHub,
    closeRtcSessions,
    setBusy,
    setErrorText,
    setUiState,
    setLobby,
    setPingMs,
    setJoinLobbyId,
    setIsCreateLobbyOpen,
    setLocalParticipantId,
    setChatMessages,
    setChatDraft,
    setConnectionStatus,
    setStatusText,
  });

  const localParticipant = lobby?.players.find(
    (player) => player.participantId === localParticipantId,
  );
  const isHost = Boolean(localParticipant?.isHost);
  const showDebugOverlay = shouldShowDebugOverlay();
  const displayedPublicLobbies = filterPublicLobbies(
    publicLobbies,
    joinGameFilter,
    joinModeFilter,
  );
  const currentMatchKind = deriveMatchKind(lobby?.mode ?? "multiplayerRace");
  const currentMatchPhase = deriveDisplayedMatchPhase({
    lobbyState: lobby?.state ?? null,
    uiState,
  });
  const currentHudModel = buildHudModel(currentMatchKind, currentMatchPhase);
  const readyPlayerCount = lobby ? countReadyPlayers(lobby) : 0;
  const canStartLobby = Boolean(
    isHost &&
    lobby &&
    lobby.players.length >= 2 &&
    readyPlayerCount === lobby.players.length,
  );
  const canForceStartLobby = Boolean(
    isHost &&
    lobby &&
    lobby.players.length >= 2 &&
    readyPlayerCount < lobby.players.length,
  );
  const canEndMatch = Boolean(isHost && lobby?.state === "started");

  const {
    runtimeDebugStats,
    nativeDebugStats,
    networkDebugOptions,
    updateNetworkDebugOption,
    resetNetworkDebugOptions,
  } = useMultiplayerDebugTelemetry(showDebugOverlay);

  const activeMatchConfig =
    lobby?.state === "started" && lobby.matchConfig ? lobby.matchConfig : null;
  const activeMatchConfigRef = useRef<MultiplayerMatchConfig | null>(null);
  const activeMatchLaunchKey =
    activeMatchConfig && localParticipantId
      ? `${activeMatchConfig.matchId}:${localParticipantId}`
      : null;
  const lobbyState = lobby?.state ?? null;

  useEffect(() => {
    if (
      lobbyState === "match_ended" ||
      lobbyState === "ended" ||
      lobbyState === "closed" ||
      lobbyState === "expired"
    ) {
      stopActiveGame();
    }
  }, [lobbyState, stopActiveGame]);

  useEffect(() => {
    activeMatchConfigRef.current = activeMatchConfig;
  }, [activeMatchConfig]);

  useEffect(() => {
    const stopGame = stopGameRef.current;
    if (stopGame) {
      stopGame();
      stopGameRef.current = null;
    }

    const matchConfig = activeMatchConfigRef.current;
    const participantId = localParticipantIdRef.current;
    if (!matchConfig || !participantId) {
      return;
    }
    const compatibilityResult = validateRuntimeCompatibility(matchConfig, {
      protocolVersion: RUNTIME_PROTOCOL_VERSION,
      runtimeVersion: RUNTIME_COMPAT_VERSION,
      contentHash: RUNTIME_CONTENT_HASH,
    });
    if (compatibilityResult.isErr()) {
      queueMicrotask(() => {
        setErrorText(compatibilityResult.error);
        setUiState("disconnected");
      });
      return;
    }

    const launchSpec = resolveMultiplayerLaunchSpec(matchConfig);
    if (!launchSpec) {
      queueMicrotask(() => {
        setErrorText(`Unsupported multiplayer game: ${matchConfig.gameId}`);
      });
      return;
    }

    const canvas = gameCanvasRef.current;
    if (!canvas) {
      queueMicrotask(() => {
        setErrorText("Game canvas is not ready");
      });
      return;
    }

    queueMicrotask(() => {
      setErrorText(null);
      setUiState("loading-runtime");
      setStatusText("Launching multiplayer runtime…");
    });
    runtimeStartRequestedRef.current = false;
    runTokenRef.current += 1;
    const useFallbackTransport =
      shouldUseMockHub() || forceLocalRuntimeTransport;
    const mockRuntimeTransportHandle = useFallbackTransport
      ? createMockRuntimeTransport({
          matchId: matchConfig.matchId,
          participantId,
        })
      : null;
    const activeRuntimeTransport = useFallbackTransport
      ? (mockRuntimeTransportHandle?.transport ?? null)
      : (runtimeTransportRef.current?.transport ?? null);

    if (!activeRuntimeTransport) {
      queueMicrotask(() => {
        setUiState("connecting-peer");
        setStatusText("Waiting for peer data channel…");
      });
      return () => {
        mockRuntimeTransportHandle?.dispose();
      };
    }

    const stop = startGamePreview({
      canvas,
      config: launchSpec.config,
      levelNumber: launchSpec.levelNumber,
      currentLevelInfo: launchSpec.currentLevelInfo,
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      runToken: runTokenRef.current,
      normalLaunch: false,
      networkMatchConfig: matchConfig,
      localParticipantId: participantId,
      networkRuntimeTransport: activeRuntimeTransport,
      deferNetworkStart: true,
      onStartNetworkMatchReady: (start) => {
        startNetworkMatchRef.current = start;
        if (runtimeStartRequestedRef.current) {
          runtimeStartRequestedRef.current = false;
          const started = start();
          if (started.isErr()) {
            setErrorText(started.error);
            setUiState("disconnected");
            return;
          }
          setUiState("running");
          setStatusText("Match started");
        }
      },
      onRuntimeEvent: (event) => {
        if (event.type === "runtimeConfigApplied") {
          setUiState("waiting-for-peer-runtime");
          setStatusText("Runtime configured. Waiting for peers…");
          return;
        }
        if (event.type === "runtimeLevelReady") {
          runtimeReadyPeersRef.current.add(participantId);
          const activeLobby = lobbyRef.current;
          const hubClient = hubClientRef.current;
          if (hubClient && activeLobby) {
            void hubClient.reportRuntimeLevelReady(activeLobby.id);
          }
          return;
        }
        if (event.type === "runtimeLoadFailed") {
          setUiState("disconnected");
          if (event.detail) {
            setErrorText(event.detail);
          }
        }
      },
      onStatus: (text) => {
        if (text.trim().length > 0) {
          setStatusText(text);
          return;
        }
        setStatusText("Runtime ready");
      },
      onError: (message) => {
        setErrorText(message);
        setUiState("disconnected");
        setStatusText("Runtime failed to launch");
      },
    });
    stopGameRef.current = stop;

    return () => {
      startNetworkMatchRef.current = null;
      runtimeStartRequestedRef.current = false;
      runtimeStartNotifiedRef.current = false;
      if (stopGameRef.current === stop) {
        stop();
        stopGameRef.current = null;
      }
      mockRuntimeTransportHandle?.dispose();
    };
  }, [
    activeMatchLaunchKey,
    runtimeTransportRevision,
    forceLocalRuntimeTransport,
  ]);

  const handleCopyLobbyId = (): void => {
    if (!lobby) {
      return;
    }

    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) {
      setErrorText("Clipboard is not available in this browser");
      return;
    }

    void clipboard
      .writeText(lobby.id)
      .then(() => {
        setStatusText("Lobby ID copied");
      })
      .catch(() => {
        setErrorText("Could not copy lobby ID");
      });
  };
  const displayedPingMs = lobby && localParticipantId ? pingMs : null;
  const hudLabel = currentHudModel.showResults
    ? "Results"
    : currentHudModel.showLapCounter
      ? "Lap HUD"
      : currentHudModel.showObjectiveScore
        ? "Objective HUD"
        : "Lobby HUD";

  return (
    <div
      className={
        lobby
          ? "flex h-full min-h-0 w-full flex-col overflow-y-auto p-3 text-foreground md:p-4 lg:overflow-hidden"
          : "min-h-full w-full space-y-6 overflow-y-auto p-4 text-foreground md:p-8"
      }
    >
      {!lobby ? (
        <LobbyBrowser
          isCreateLobbyOpen={isCreateLobbyOpen}
          formState={formState}
          joinLobbyId={joinLobbyId}
          busy={busy}
          isPreloading={uiState === "preloading-game"}
          lobbyListErrorText={lobbyListErrorText}
          displayedPublicLobbies={displayedPublicLobbies}
          joinGameFilter={joinGameFilter}
          joinModeFilter={joinModeFilter}
          onCreateLobbyOpenChange={setIsCreateLobbyOpen}
          onFormStateChange={setFormState}
          onJoinLobbyIdChange={setJoinLobbyId}
          onJoinGameFilterChange={setJoinGameFilter}
          onJoinModeFilterChange={setJoinModeFilter}
          onRefreshLobbies={loadPublicLobbies}
          onCreateLobby={() => {
            void handleCreateLobby();
          }}
          onJoinLobby={() => {
            void handleJoinLobby();
          }}
          onQuickJoinLobby={(lobbyIdToJoin) => {
            void handleQuickJoinLobby(lobbyIdToJoin);
          }}
        />
      ) : null}

      {lobby ? (
        <MultiplayerSessionView
          lobby={lobby}
          activeMatchConfigPresent={Boolean(activeMatchConfig)}
          showDebugOverlay={showDebugOverlay}
          localParticipantId={localParticipantId}
          localPlayerIndex={localParticipant?.playerIndex ?? null}
          connectionStatus={connectionStatus}
          currentMatchPhase={currentMatchPhase}
          rtcStatusText={rtcStatusText}
          displayedPingMs={displayedPingMs}
          currentMatchKind={currentMatchKind}
          hudLabel={hudLabel}
          statusText={statusText}
          errorText={errorText}
          isHost={isHost}
          readyPlayerCount={readyPlayerCount}
          busy={busy}
          chatMessages={chatMessages}
          chatDraft={chatDraft}
          localParticipantIsReady={localParticipant?.isReady ?? false}
          hasLocalParticipant={Boolean(localParticipant)}
          canStartLobby={canStartLobby}
          canForceStartLobby={canForceStartLobby}
          canEndMatch={canEndMatch}
          packetCounts={packetCounts}
          runtimeDebugStats={runtimeDebugStats}
          nativeDebugStats={nativeDebugStats}
          networkDebugOptions={networkDebugOptions}
          gameCanvasRef={gameCanvasRef}
          onCopyLobbyId={handleCopyLobbyId}
          onRemoveParticipant={(participantId) => {
            void handleRemoveParticipant(participantId);
          }}
          onChatDraftChange={setChatDraft}
          onSendChat={() => {
            void handleSendChat();
          }}
          onToggleReady={() => {
            void handleSetReady(!(localParticipant?.isReady ?? false));
          }}
          onStart={() => {
            void handleStart(false);
          }}
          onStartAnyway={() => {
            void handleStart(true);
          }}
          onUpdateSelection={(mode, trackOrLevel, tagDurationMinutes) => {
            void handleUpdateSelection(mode, trackOrLevel, tagDurationMinutes);
          }}
          onEndMatch={() => {
            void handleEndMatch();
          }}
          onLeave={() => {
            void handleLeave();
          }}
          onResetNetworkDebugOptions={resetNetworkDebugOptions}
          onUpdateNetworkDebugOption={updateNetworkDebugOption}
        />
      ) : null}
    </div>
  );
}
