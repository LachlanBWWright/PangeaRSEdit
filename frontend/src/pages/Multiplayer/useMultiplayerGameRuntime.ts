import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { createMockRuntimeTransport } from "@/multiplayer/mockRuntimeTransport";
import { resolveMultiplayerLaunchSpec } from "@/multiplayer/launchSpec";
import type { MultiplayerLobbyDetails, MultiplayerMatchConfig } from "@/multiplayer/types";
import { validateRuntimeCompatibility } from "@/multiplayer/runtimeCompatibility";
import { startGamePreview } from "@/editor/utils/gamePreviewHostRuntime";
import type { StartNetworkMatchFn } from "@/editor/utils/gamePreviewRuntime";
import type { MultiplayerUiState } from "./types";
import { shouldUseMockHub } from "@/multiplayer/browserFlags";
import type { Result as NtResult } from "neverthrow";

export interface MultiplayerRuntimeTransportHandle {
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
}

const RUNTIME_PROTOCOL_VERSION = 1;
const RUNTIME_COMPAT_VERSION = "host-authoritative-v2";

interface UseMultiplayerGameRuntimeInput {
  readonly lobby: MultiplayerLobbyDetails | null;
  readonly localParticipantId: string | null;
  readonly forceLocalRuntimeTransport: boolean;
  readonly runtimeTransportRevision: number;
  readonly lobbyRef: RefObject<MultiplayerLobbyDetails | null>;
  readonly hubClientRef: RefObject<{
    readonly reportRuntimeLevelReady: (lobbyId: string) => unknown;
  } | null>;
  readonly runtimeTransportRef: RefObject<MultiplayerRuntimeTransportHandle | null>;
  readonly runtimeReadyPeersRef: MutableRefObject<Set<string>>;
  readonly startNetworkMatchRef: MutableRefObject<StartNetworkMatchFn | null>;
  readonly runtimeStartRequestedRef: MutableRefObject<boolean>;
  readonly runtimeStartNotifiedRef: MutableRefObject<boolean>;
  readonly runTokenRef: MutableRefObject<number>;
  readonly gameCanvasRef: RefObject<HTMLCanvasElement | null>;
  readonly stopGameRef: MutableRefObject<(() => void) | null>;
  readonly setErrorText: (errorText: string | null) => void;
  readonly setUiState: (uiState: MultiplayerUiState) => void;
  readonly setStatusText: (statusText: string) => void;
}

export function useMultiplayerGameRuntime(
  input: UseMultiplayerGameRuntimeInput,
): MultiplayerMatchConfig | null {
  const {
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
  } = input;
  const activeMatchConfig =
    lobby?.state === "started" && lobby.matchConfig
      ? lobby.matchConfig
      : null;
  const activeMatchConfigRef = useRef<MultiplayerMatchConfig | null>(null);
  const activeMatchLaunchKey =
    activeMatchConfig && localParticipantId
      ? `${activeMatchConfig.matchId}:${localParticipantId}`
      : null;

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
    const participantId = localParticipantId;
    if (!matchConfig || !participantId) {
      return;
    }

    const compatibilityResult = validateRuntimeCompatibility(matchConfig, {
      protocolVersion: RUNTIME_PROTOCOL_VERSION,
      runtimeVersion: RUNTIME_COMPAT_VERSION,
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
        if (!runtimeStartRequestedRef.current) {
          return;
        }
        runtimeStartRequestedRef.current = false;
        const started = start();
        if (started.isErr()) {
          setErrorText(started.error);
          setUiState("disconnected");
          return;
        }
        setUiState("running");
        setStatusText("Match started");
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
        setStatusText(text.trim().length > 0 ? text : "Runtime ready");
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
    gameCanvasRef,
    hubClientRef,
    lobbyRef,
    localParticipantId,
    runTokenRef,
    forceLocalRuntimeTransport,
    runtimeReadyPeersRef,
    runtimeStartNotifiedRef,
    runtimeStartRequestedRef,
    runtimeTransportRef,
    runtimeTransportRevision,
    setErrorText,
    setStatusText,
    setUiState,
    startNetworkMatchRef,
    stopGameRef,
  ]);

  return activeMatchConfig;
}
