import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errAsync, okAsync } from "neverthrow";
import {
  createAndConnectHubClient,
  type MultiplayerHubClient,
} from "@/multiplayer/hub";
import {
  heartbeatLobby,
  listLobbies,
} from "@/multiplayer/api";
import type {
  MultiplayerLobbyDetails,
  MultiplayerLobbySummary,
} from "@/multiplayer/types";
import { fetchIceServers } from "@/multiplayer/webrtc/iceServers";
import { createPeerConnection } from "@/multiplayer/webrtc/createPeerConnection";
import {
  createHostSession,
  type HostSession,
} from "@/multiplayer/webrtc/hostSession";
import {
  createClientSession,
  type ClientSession,
} from "@/multiplayer/webrtc/clientSession";
import { observeRtcResult } from "@/multiplayer/webrtc/observeRtcResult";
import { createHostRuntimeTransportMultiplexer } from "@/multiplayer/runtimeTransportMultiplexer";
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
  resolveMultiplayerLaunchSpecFromSelection,
} from "@/multiplayer/launchSpec";
import { preloadGameRuntimeAssets } from "@/multiplayer/runtimeAssetPreload";
import {
  getConnectionStatus,
} from "@/multiplayer/lobbyState";
import {
  shouldForceLocalTransport,
  shouldShowDebugOverlay,
  shouldUseMockHub,
} from "@/multiplayer/browserFlags";
import { createMultiplayerHubEvents } from "./Multiplayer/createMultiplayerHubEvents";
import { useMultiplayerDebugTelemetry } from "./Multiplayer/useMultiplayerDebugTelemetry";
import {
  useMultiplayerGameRuntime,
  type MultiplayerRuntimeTransportHandle,
} from "./Multiplayer/useMultiplayerGameRuntime";
import { useMultiplayerRuntimeTransport } from "./Multiplayer/useMultiplayerRuntimeTransport";

export function MultiplayerPage() {
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
  const runtimeTransportRef =
    useRef<MultiplayerRuntimeTransportHandle | null>(null);
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

  const runtimeTransportInput = useMemo(
    () => ({
      lobbyRef,
      localParticipantIdRef,
      hostSessionRef,
      clientSessionRef,
      runtimeTransportRef,
      hostRuntimeMuxRef,
      setRuntimeTransportRevision,
      setErrorText,
      setLobby,
      setStatusText,
      setRtcStatusText,
      setUiState,
      stopActiveGame,
    }),
    [stopActiveGame],
  );
  const {
    closeRuntimeTransport,
    bindClientRuntimeDataChannels,
    bindHostRuntimeDataChannels,
    closeRtcSessions,
  } = useMultiplayerRuntimeTransport(runtimeTransportInput);

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

    const events = createMultiplayerHubEvents({
      nextLobby,
      participantId,
      hostSessionRef,
      clientSessionRef,
      hostRuntimeMuxRef,
      lobbyRef,
      localParticipantIdRef,
      hubClientRef,
      runtimeReadyPeersRef,
      startNetworkMatchRef,
      runtimeStartRequestedRef,
      runtimeStartNotifiedRef,
      setStatusText,
      setErrorText,
      setLobby,
      setUiState,
      setLocalParticipantId,
      setPingMs,
      setChatMessages,
      resetLobbyChatState,
      closeRuntimeTransport,
      observeRtcResult: (result, message) => {
        observeRtcResult(result, message, setErrorText);
      },
    });

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

  const activeMatchConfig = useMultiplayerGameRuntime({
    lobby,
    localParticipantId,
    forceLocalRuntimeTransport,
    runtimeTransportRevision,
    lobbyRef,
    hubClientRef,
    runtimeTransportRef,
    runtimeReadyPeersRef,
    startNetworkMatchRef,
    runtimeStartRequestedRef,
    runtimeStartNotifiedRef,
    runTokenRef,
    gameCanvasRef,
    stopGameRef,
    setErrorText,
    setUiState,
    setStatusText,
  });

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
