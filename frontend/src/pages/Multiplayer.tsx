import { useCallback, useEffect, useRef, useState } from "react";
import { Result, ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import {
  createAndConnectHubClient,
  type MultiplayerHubClient,
  type MultiplayerHubEvents,
} from "@/multiplayer/hub";
import {
  createLobby,
  getLobbyPreview,
  heartbeatLobby,
  joinLobby,
  listLobbies,
  leaveLobby,
  reportDesync,
  reportHostDisconnected,
  reportParticipantDisconnected,
  reportTimeout,
  setLobbyReady,
  startLobby,
} from "@/multiplayer/api";
import { createMockRuntimeTransport } from "@/multiplayer/mockRuntimeTransport";
import type {
  MultiplayerLobbyDetails,
  MultiplayerMatchConfig,
  MultiplayerLobbySummary,
} from "@/multiplayer/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startGamePreview } from "@/editor/utils/gamePreviewHostRuntime";
import { buildPreviewAssetBaseUrls } from "@/editor/utils/gamePreviewRuntime";
import {
  CROMAG_TRACKS,
  type CroMagTrackInfo,
} from "@/editor/utils/croMagLevelNumbers";
import {
  NANOSAUR2_LEVELS,
  type Nanosaur2LevelInfo,
} from "@/editor/utils/nanosaur2LevelNumbers";
import {
  GAME_PORT_CONFIGS,
  getLevelIndex,
  type AnyLevelInfo,
  type GamePortConfig,
} from "@/editor/utils/gamePortConfig";
import { Game } from "@/data/globals/globals";
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
import {
  createWebRtcRuntimeTransport,
  type WebRtcRuntimeDisruptionEvent,
  type WebRtcRuntimeTransportHandle,
} from "@/multiplayer/webrtcRuntimeTransport";
import { runRuntimePreflight } from "@/multiplayer/runtimePreflight/runRuntimePreflight";
import type { StartNetworkMatchFn } from "@/editor/utils/gamePreviewRuntime";

interface LobbyFormState {
  readonly gameId: string;
  readonly mode: string;
  readonly trackOrLevel: string;
  readonly maxPlayers: number;
  readonly displayName: string;
  readonly isPublic: boolean;
}

interface LobbyChatMessage {
  readonly lobbyId: string;
  readonly participantId: string;
  readonly displayName: string;
  readonly message: string;
  readonly createdAt: string;
}

type LobbyIntent = "create" | "join";
type MultiplayerUiState =
  | "idle"
  | "preloading-game"
  | "preflight-failed"
  | "joining-lobby"
  | "in-lobby"
  | "connecting-peer"
  | "loading-runtime"
  | "waiting-for-peer-runtime"
  | "waiting-for-host-start"
  | "running"
  | "disconnected";

const defaultFormState: LobbyFormState = {
  gameId: "cromagrally",
  mode: "multiplayerRace",
  trackOrLevel: "1",
  maxPlayers: 2,
  displayName: "Player",
  isPublic: true,
};

interface GameModeOption {
  readonly value: string;
  readonly label: string;
}

interface LevelOption {
  readonly value: string;
  readonly label: string;
}

const CROMAG_RACE_OPTIONS: readonly LevelOption[] = CROMAG_TRACKS.filter(
  (t) => t.trackNumber <= 9,
).map((t) => ({ value: String(t.trackNumber), label: t.name }));

const CROMAG_BATTLE_OPTIONS: readonly LevelOption[] = CROMAG_TRACKS.filter(
  (t) => t.trackNumber >= 10,
).map((t) => ({ value: String(t.trackNumber), label: t.name }));

const CROMAG_MODE_OPTIONS: readonly GameModeOption[] = [
  { value: "multiplayerRace", label: "Race (tracks 1\u20139)" },
  { value: "multiplayerBattle", label: "Battle (arenas 10\u201317)" },
];

const NANOSAUR2_MODE_OPTIONS: readonly GameModeOption[] = [
  { value: "multiplayerRace", label: "Race" },
  { value: "multiplayerBattle", label: "Battle" },
  { value: "multiplayerFlag", label: "Capture the Flag" },
];

function getModeOptions(gameId: string): readonly GameModeOption[] {
  if (gameId === "nanosaur2") return NANOSAUR2_MODE_OPTIONS;
  return CROMAG_MODE_OPTIONS;
}

function getTrackOptions(gameId: string, mode: string): readonly LevelOption[] {
  if (gameId === "nanosaur2") {
    if (mode === "multiplayerBattle") {
      return NANOSAUR2_LEVELS.filter(
        (l) => l.levelNumber >= 5 && l.levelNumber <= 6,
      ).map((l) => ({ value: String(l.levelNumber), label: l.name }));
    }
    if (mode === "multiplayerFlag") {
      return NANOSAUR2_LEVELS.filter((l) => l.levelNumber >= 7).map((l) => ({
        value: String(l.levelNumber),
        label: l.name,
      }));
    }
    return NANOSAUR2_LEVELS.filter(
      (l) => l.levelNumber >= 3 && l.levelNumber <= 4,
    ).map((l) => ({ value: String(l.levelNumber), label: l.name }));
  }
  if (mode === "multiplayerBattle") return CROMAG_BATTLE_OPTIONS;
  return CROMAG_RACE_OPTIONS;
}

function defaultTrackForMode(gameId: string, mode: string): string {
  return getTrackOptions(gameId, mode)[0]?.value ?? "1";
}

interface MultiplayerLaunchSpec {
  readonly config: GamePortConfig;
  readonly levelNumber: number;
  readonly currentLevelInfo: AnyLevelInfo | undefined;
}

function normalizeLevelKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseLevelNumber(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveCroMagTrackNumber(trackOrLevel: string): number {
  const parsed = parseLevelNumber(trackOrLevel);
  if (parsed !== null) {
    return parsed;
  }

  const normalizedInput = normalizeLevelKey(trackOrLevel);
  const explicitAliases: Readonly<Record<string, number>> = {
    iceramp: 17,
    ramp: 17,
    ramps: 17,
    tarpits: 15,
    stonehenge: 10,
  };
  const aliased = explicitAliases[normalizedInput];
  if (aliased !== undefined) {
    return aliased;
  }

  const matchedTrack = CROMAG_TRACKS.find((track: CroMagTrackInfo) => {
    const terrainBase = track.terrainFile.replace(/\.ter$/i, "");
    const vfsBase = track.vfsTerrainFile.replace(/\.ter$/i, "");
    const keys = [
      String(track.trackNumber),
      normalizeLevelKey(track.name),
      normalizeLevelKey(terrainBase),
      normalizeLevelKey(vfsBase),
    ];
    return keys.includes(normalizedInput);
  });

  return matchedTrack?.trackNumber ?? 1;
}

function resolveNanosaur2LevelNumber(trackOrLevel: string): number {
  const parsed = parseLevelNumber(trackOrLevel);
  if (parsed !== null) {
    return parsed;
  }

  const normalizedInput = normalizeLevelKey(trackOrLevel);
  const matchedLevel = NANOSAUR2_LEVELS.find((level: Nanosaur2LevelInfo) => {
    const terrainBase = level.terrainFile.replace(/\.ter$/i, "");
    const keys = [
      String(level.levelNumber),
      normalizeLevelKey(level.name),
      normalizeLevelKey(terrainBase),
    ];
    return keys.includes(normalizedInput);
  });

  return matchedLevel?.levelNumber ?? 0;
}

function resolveMultiplayerLaunchSpec(
  matchConfig: MultiplayerMatchConfig,
): MultiplayerLaunchSpec | null {
  if (matchConfig.gameId === "cromagrally") {
    const config = GAME_PORT_CONFIGS[Game.CRO_MAG];
    const levelNumber = resolveCroMagTrackNumber(matchConfig.trackOrLevel);
    const currentLevelInfo = config.levels.find(
      (levelInfo) => getLevelIndex(levelInfo) === levelNumber,
    );
    return {
      config,
      levelNumber,
      currentLevelInfo,
    };
  }

  if (matchConfig.gameId === "nanosaur2") {
    const config = GAME_PORT_CONFIGS[Game.NANOSAUR_2];
    const levelNumber = resolveNanosaur2LevelNumber(matchConfig.trackOrLevel);
    const currentLevelInfo = config.levels.find(
      (levelInfo) => getLevelIndex(levelInfo) === levelNumber,
    );
    return {
      config,
      levelNumber,
      currentLevelInfo,
    };
  }

  return null;
}

function resolveMultiplayerLaunchSpecFromSelection(
  gameId: string,
  trackOrLevel: string,
): MultiplayerLaunchSpec | null {
  if (gameId === "cromagrally") {
    const config = GAME_PORT_CONFIGS[Game.CRO_MAG];
    const levelNumber = resolveCroMagTrackNumber(trackOrLevel);
    const currentLevelInfo = config.levels.find(
      (levelInfo) => getLevelIndex(levelInfo) === levelNumber,
    );
    return {
      config,
      levelNumber,
      currentLevelInfo,
    };
  }

  if (gameId === "nanosaur2") {
    const config = GAME_PORT_CONFIGS[Game.NANOSAUR_2];
    const levelNumber = resolveNanosaur2LevelNumber(trackOrLevel);
    const currentLevelInfo = config.levels.find(
      (levelInfo) => getLevelIndex(levelInfo) === levelNumber,
    );
    return {
      config,
      levelNumber,
      currentLevelInfo,
    };
  }

  return null;
}

const PRELOAD_DEPENDENCY_PATTERN =
  /["'`]([^"'`]+\.(?:wasm|data|mem|worker\.js))["'`]/g;

async function preloadGameRuntimeAssets(config: GamePortConfig): Promise<void> {
  const baseUrl = buildPreviewAssetBaseUrls(config)[0];
  if (!baseUrl) {
    return;
  }

  const scriptUrl = new URL(config.mainJs, baseUrl).href;
  const preloadUrls = new Set<string>([scriptUrl]);

  const scriptResponseResult = await ResultAsync.fromPromise(
    fetch(scriptUrl, {
      credentials: "same-origin",
      cache: "force-cache",
    }),
    () => null,
  );
  if (scriptResponseResult.isOk() && scriptResponseResult.value.ok) {
    const scriptTextResult = await ResultAsync.fromPromise(
      scriptResponseResult.value.text(),
      () => null,
    );
    if (scriptTextResult.isOk()) {
      const matches = scriptTextResult.value.matchAll(PRELOAD_DEPENDENCY_PATTERN);
      for (const match of matches) {
        const dependencyPath = match[1];
        if (!dependencyPath) {
          continue;
        }
        preloadUrls.add(new URL(dependencyPath, baseUrl).href);
      }
    }
  }

  await Promise.all(
    Array.from(preloadUrls).map((url) =>
      ResultAsync.fromPromise(
        fetch(url, {
          credentials: "same-origin",
          cache: "force-cache",
        }),
        () => null,
      )
        .map(() => undefined)
        .orElse(() => okAsync(undefined)),
    ),
  );
}

async function preflightSelection(
  gameId: string,
  trackOrLevel: string,
): Promise<Result<void, string>> {
  const spec = resolveMultiplayerLaunchSpecFromSelection(gameId, trackOrLevel);
  if (!spec) {
    return err(`Unsupported multiplayer game: ${gameId}`);
  }
  const result = await runRuntimePreflight({
    config: spec.config,
    gameId,
    trackOrLevel,
  });
  if (result.isErr()) {
    return err(result.error.message);
  }
  return ok(undefined);
}

function shouldShowDebugOverlay(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("multiplayerDebug") === "1";
}

function shouldUseMockHub(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("multiplayerMockHub") === "1";
}

function shouldForceLocalTransport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("multiplayerForceLocal") === "1";
}

function updateLobbyWithReadyChange(
  lobby: MultiplayerLobbyDetails,
  participantId: string,
  isReady: boolean,
): MultiplayerLobbyDetails {
  return {
    ...lobby,
    players: lobby.players.map((player) =>
      player.participantId === participantId
        ? {
            ...player,
            isReady,
          }
        : player,
    ),
  };
}

function getConnectionStatus(client: MultiplayerHubClient | null): string {
  if (!client) {
    return "disconnected";
  }
  return String(client.state).toLowerCase();
}

function toLobbyIntent(value: string): LobbyIntent {
  return value === "join" ? "join" : "create";
}

export function MultiplayerPage() {
  const [lobbyIntent, setLobbyIntent] = useState<LobbyIntent>("create");
  const [formState, setFormState] = useState<LobbyFormState>(defaultFormState);
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
  const [runtimeTransportRevision, setRuntimeTransportRevision] = useState(0);
  const [rtcStatusText, setRtcStatusText] = useState("idle");
  const [forceLocalRuntimeTransport, setForceLocalRuntimeTransport] =
    useState(false);
  const hubClientRef = useRef<MultiplayerHubClient | null>(null);
  const hostSessionRef = useRef<HostSession | null>(null);
  const clientSessionRef = useRef<ClientSession | null>(null);
  const runtimeTransportRef = useRef<WebRtcRuntimeTransportHandle | null>(null);
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
      return;
    }
    active.dispose();
    runtimeTransportRef.current = null;
    setRuntimeTransportRevision((previous) => previous + 1);
  }, []);

  const bindRuntimeDataChannels = (channels: {
    readonly controlChannel: HostSessionDataChannel;
    readonly stateChannel: HostSessionDataChannel;
  }): void => {
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
        setStatusText(
          "Network interruption detected; waiting for sync recovery",
        );
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

    const activeLobby = lobbyRef.current;
    const activeLocalParticipantId = localParticipantIdRef.current;
    const isHostAuthority = Boolean(
      activeLobby &&
      activeLocalParticipantId &&
      activeLobby.hostParticipantId === activeLocalParticipantId,
    );

    closeRuntimeTransport();
    const nextTransport = createWebRtcRuntimeTransport({
      reliableChannel: channels.controlChannel,
      unreliableChannel: channels.stateChannel,
      isHostAuthority,
      onDisruptionEvent: reportRuntimeDisruption,
    });
    runtimeTransportRef.current = nextTransport;
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

      const stopGame = stopGameRef.current;
      if (stopGame) {
        stopGame();
        stopGameRef.current = null;
      }
    };
  }, [closeRtcSessions]);

  const lobbyId = lobby?.id ?? null;

  useEffect(() => {
    if (lobbyIntent !== "create" || lobby) {
      return;
    }

    const preloadSpec = resolveMultiplayerLaunchSpecFromSelection(
      formState.gameId,
      formState.trackOrLevel,
    );
    if (!preloadSpec) {
      return;
    }

    const preloadKey = `selection:${formState.gameId}:${formState.trackOrLevel}`;
    if (preloadedRuntimeKeysRef.current.has(preloadKey)) {
      return;
    }
    preloadedRuntimeKeysRef.current.add(preloadKey);
    void preloadGameRuntimeAssets(preloadSpec.config);
  }, [formState.gameId, formState.trackOrLevel, lobby, lobbyIntent]);

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

  useEffect(() => {
    if (lobbyIntent !== "join" || lobby) {
      return;
    }

    const loadPublicLobbies = (): void => {
      void listLobbies({ gameId: formState.gameId }).then((result) => {
        if (result.isOk()) {
          setPublicLobbies(result.value);
        }
      });
    };

    loadPublicLobbies();
    const intervalId = window.setInterval(loadPublicLobbies, 5000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [formState.gameId, lobby, lobbyIntent]);

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

    const iceServersResult = await fetchIceServers();
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
          void hostSession.startPeer(peerParticipantId);
        }
      },
      onPeerDisconnected: (peerParticipantId) => {
        setStatusText(`Peer disconnected: ${peerParticipantId}`);
        hostSessionRef.current?.closePeer(peerParticipantId);
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
      },
      onReceiveOffer: (fromId, targetId, sdp) => {
        if (targetId !== participantId) {
          return;
        }
        const clientSession = clientSessionRef.current;
        if (!clientSession) {
          return;
        }
        void clientSession.receiveOffer(fromId, sdp);
      },
      onReceiveAnswer: (fromId, targetId, sdp) => {
        if (targetId !== participantId) {
          return;
        }
        const hostSession = hostSessionRef.current;
        if (!hostSession) {
          return;
        }
        void hostSession.applyAnswer(fromId, sdp);
      },
      onReceiveIceCandidate: (fromId, targetId, candidate) => {
        if (targetId !== participantId) {
          return;
        }
        const hostSession = hostSessionRef.current;
        if (hostSession) {
          void hostSession.applyIceCandidate(fromId, candidate);
          return;
        }
        const clientSession = clientSessionRef.current;
        if (!clientSession) {
          return;
        }
        void clientSession.applyIceCandidate(candidate);
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
          connectResult.value.sendIceCandidate(
            nextLobby.id,
            targetParticipantId,
            candidate,
          ).mapErr((error) => error.message),
        onStateChanged: (_, state) => {
          setRtcStatusText(state);
          if (state === "failed") {
            setForceLocalRuntimeTransport(true);
            setStatusText(
              "WebRTC failed, switched to local fallback transport",
            );
          }
        },
        onDataChannelOpened: (_, channels) => {
          bindRuntimeDataChannels(channels);
          setRtcStatusText("connected");
        },
      });

      for (const player of nextLobby.players) {
        if (player.participantId === participantId) {
          continue;
        }
        void hostSessionRef.current.startPeer(player.participantId);
      }
    } else {
      clientSessionRef.current = createClientSession({
        createPeerConnection: createConnectionForClient,
        sendAnswer: (targetParticipantId, sdp) =>
          connectResult.value
            .sendAnswer(nextLobby.id, targetParticipantId, sdp)
            .mapErr((error) => error.message),
        sendIceCandidate: (targetParticipantId, candidate) =>
          connectResult.value.sendIceCandidate(
            nextLobby.id,
            targetParticipantId,
            candidate,
          ).mapErr((error) => error.message),
        onStateChanged: (state) => {
          setRtcStatusText(state);
          if (state === "failed") {
            setForceLocalRuntimeTransport(true);
            setStatusText(
              "WebRTC failed, switched to local fallback transport",
            );
          }
        },
        onDataChannelOpened: (channels) => {
          bindRuntimeDataChannels(channels);
          setRtcStatusText("connected");
        },
      });
    }
  };

  const handleCreateLobby = async (): Promise<void> => {
    setBusy(true);
    setErrorText(null);
    setUiState("preloading-game");
    const preflightResult = await preflightSelection(
      formState.gameId,
      formState.trackOrLevel,
    );
    if (preflightResult.isErr()) {
      setErrorText(preflightResult.error);
      setUiState("preflight-failed");
      setBusy(false);
      return;
    }
    setUiState("joining-lobby");
    const result = await createLobby(formState);
    if (result.isErr()) {
      setErrorText(result.error.message);
      setBusy(false);
      return;
    }
    setLobby(result.value);
    setUiState("in-lobby");
    setPingMs(null);
    resetLobbyChatState();
    setJoinLobbyId(result.value.id);
    await connectHub(result.value);
    setBusy(false);
  };

  const handleJoinLobby = async (): Promise<void> => {
    setBusy(true);
    setErrorText(null);
    setUiState("preloading-game");
    const previewResult = await getLobbyPreview(joinLobbyId.trim());
    if (previewResult.isErr()) {
      setErrorText(previewResult.error.message);
      setUiState("preflight-failed");
      setBusy(false);
      return;
    }
    if (!previewResult.value.canJoin) {
      setErrorText("Lobby is not open for joining.");
      setUiState("preflight-failed");
      setBusy(false);
      return;
    }
    const preflightResult = await preflightSelection(
      previewResult.value.gameId,
      previewResult.value.trackOrLevel,
    );
    if (preflightResult.isErr()) {
      setErrorText(preflightResult.error);
      setUiState("preflight-failed");
      setBusy(false);
      return;
    }
    setUiState("joining-lobby");
    const result = await joinLobby({
      lobbyId: joinLobbyId.trim(),
      displayName: formState.displayName,
    });
    if (result.isErr()) {
      setErrorText(result.error.message);
      setBusy(false);
      return;
    }
    setLobby(result.value);
    setUiState("in-lobby");
    setPingMs(null);
    resetLobbyChatState();
    await connectHub(result.value);
    setBusy(false);
  };

  const handleQuickJoinLobby = async (lobbyIdToJoin: string): Promise<void> => {
    setJoinLobbyId(lobbyIdToJoin);
    setLobbyIntent("join");
    setBusy(true);
    setErrorText(null);
    setUiState("preloading-game");
    const lobbySummary = publicLobbies.find((item) => item.id === lobbyIdToJoin);
    if (!lobbySummary) {
      setErrorText("Lobby no longer exists");
      setUiState("preflight-failed");
      setBusy(false);
      return;
    }
    if (lobbySummary.canJoin === false) {
      setErrorText("Lobby is not open for joining.");
      setUiState("preflight-failed");
      setBusy(false);
      return;
    }
    const preflightResult = await preflightSelection(
      lobbySummary.gameId,
      lobbySummary.trackOrLevel,
    );
    if (preflightResult.isErr()) {
      setErrorText(preflightResult.error);
      setUiState("preflight-failed");
      setBusy(false);
      return;
    }
    setUiState("joining-lobby");
    const result = await joinLobby({
      lobbyId: lobbyIdToJoin,
      displayName: formState.displayName,
    });
    if (result.isErr()) {
      setErrorText(result.error.message);
      setBusy(false);
      return;
    }
    setLobby(result.value);
    setUiState("in-lobby");
    setPingMs(null);
    resetLobbyChatState();
    await connectHub(result.value);
    setBusy(false);
  };

  const handleSetReady = async (isReady: boolean): Promise<void> => {
    if (!lobby) {
      return;
    }
    setBusy(true);
    setErrorText(null);
    const result = await setLobbyReady({
      lobbyId: lobby.id,
      isReady,
    });
    if (result.isErr()) {
      setErrorText(result.error.message);
      setBusy(false);
      return;
    }
    setLobby(result.value);
    setBusy(false);
  };

  const handleStart = async (): Promise<void> => {
    if (!lobby) {
      return;
    }
    setBusy(true);
    setErrorText(null);
    const startResult = await startLobby({ lobbyId: lobby.id });
    if (startResult.isErr()) {
      setErrorText(startResult.error.message);
      setBusy(false);
      return;
    }
    setLobby(startResult.value);
    const hubClient = hubClientRef.current;
    if (hubClient) {
      const notifyResult = await hubClient.notifyMatchStarting(lobby.id);
      if (notifyResult.isErr()) {
        setErrorText(notifyResult.error.message);
      }
    }
    setBusy(false);
  };

  const handleLeave = async (): Promise<void> => {
    if (!lobby) {
      return;
    }
    setBusy(true);
    setErrorText(null);
    await reportParticipantDisconnected(lobby.id, "left lobby");
    const leaveResult = await leaveLobby(lobby.id);
    if (leaveResult.isErr()) {
      setErrorText(leaveResult.error.message);
      setBusy(false);
      return;
    }

    const hubClient = hubClientRef.current;
    if (hubClient) {
      await hubClient.disconnect();
      hubClientRef.current = null;
    }
    closeRtcSessions();
    setLobby(null);
    runtimeReadyPeersRef.current.clear();
    startNetworkMatchRef.current = null;
    runtimeStartRequestedRef.current = false;
    runtimeStartNotifiedRef.current = false;
    runtimeStartNotifiedRef.current = false;
    setLocalParticipantId(null);
    setPingMs(null);
    resetLobbyChatState();
    setConnectionStatus("disconnected");
    setStatusText("Disconnected");
    setUiState("disconnected");
    setBusy(false);
  };

  const handleRemoveParticipant = async (
    targetParticipantId: string,
  ): Promise<void> => {
    if (!lobby) {
      return;
    }

    const hubClient = hubClientRef.current;
    if (!hubClient) {
      setErrorText("Not connected to signaling hub");
      return;
    }

    const result = await hubClient.removeParticipant(
      lobby.id,
      targetParticipantId,
    );
    if (result.isErr()) {
      setErrorText(result.error.message);
      return;
    }

    setStatusText("Participant removed");
  };

  const handleSendChat = async (): Promise<void> => {
    if (!lobby) {
      return;
    }
    const trimmedMessage = chatDraft.trim();
    if (trimmedMessage.length === 0) {
      return;
    }

    const hubClient = hubClientRef.current;
    if (!hubClient) {
      setErrorText("Not connected to signaling hub");
      return;
    }

    const result = await hubClient.sendLobbyChat(lobby.id, trimmedMessage);
    if (result.isErr()) {
      setErrorText(result.error.message);
      return;
    }

    setChatDraft("");
  };

  const localParticipant = lobby?.players.find(
    (player) => player.participantId === localParticipantId,
  );
  const isHost = Boolean(localParticipant?.isHost);
  const showDebugOverlay = shouldShowDebugOverlay();

  const activeMatchConfig =
    lobby?.state === "started" && lobby.matchConfig ? lobby.matchConfig : null;
  const activeMatchLaunchKey =
    activeMatchConfig && localParticipantId
      ? `${activeMatchConfig.matchId}:${localParticipantId}`
      : null;

  useEffect(() => {
    const stopGame = stopGameRef.current;
    if (stopGame) {
      stopGame();
      stopGameRef.current = null;
    }

    if (!activeMatchConfig || !localParticipantId) {
      return;
    }

    const launchSpec = resolveMultiplayerLaunchSpec(activeMatchConfig);
    if (!launchSpec) {
      queueMicrotask(() => {
        setErrorText(`Unsupported multiplayer game: ${activeMatchConfig.gameId}`);
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
          matchId: activeMatchConfig.matchId,
          participantId: localParticipantId,
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
      networkMatchConfig: activeMatchConfig,
      localParticipantId,
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
          runtimeReadyPeersRef.current.add(localParticipantId);
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
    activeMatchConfig,
    runtimeTransportRevision,
    forceLocalRuntimeTransport,
    localParticipantId,
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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 text-foreground md:p-8">
      <div className="space-y-2 rounded-xl border border-border bg-linear-to-r from-slate-950/95 via-slate-900/90 to-slate-800/80 p-4 md:p-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Multiplayer
        </h1>
        <p className="text-sm text-slate-200">
          Create a lobby or join by ID, then ready up and launch together.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle>Lobby Setup</CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose your role first, then complete only the fields needed for
            that role.
          </CardDescription>
          <Tabs
            value={lobbyIntent}
            onValueChange={(value) => {
              setLobbyIntent(toLobbyIntent(value));
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" disabled={busy || Boolean(lobby)}>
                Host / Create
              </TabsTrigger>
              <TabsTrigger value="join" disabled={busy || Boolean(lobby)}>
                Join Existing
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="multiplayer-display-name">Display Name</Label>
              <Input
                id="multiplayer-display-name"
                value={formState.displayName}
                onChange={(event) => {
                  setFormState({
                    ...formState,
                    displayName: event.target.value,
                  });
                }}
              />
            </div>

            {lobbyIntent === "join" ? (
              <div className="space-y-2">
                <Label htmlFor="multiplayer-join-lobby-id">Lobby ID</Label>
                <Input
                  id="multiplayer-join-lobby-id"
                  value={joinLobbyId}
                  placeholder="Paste lobby id"
                  disabled={busy}
                  onChange={(event) => {
                    setJoinLobbyId(event.target.value);
                  }}
                />
              </div>
            ) : null}

            {lobbyIntent === "create" ? (
              <>
                <div className="space-y-2">
                  <Label>Game</Label>
                  <Select
                    value={formState.gameId}
                    onValueChange={(newGameId) => {
                      const newMode =
                        getModeOptions(newGameId)[0]?.value ??
                        "multiplayerRace";
                      setFormState({
                        ...formState,
                        gameId: newGameId,
                        mode: newMode,
                        trackOrLevel: defaultTrackForMode(newGameId, newMode),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cromagrally">Cro-Mag Rally</SelectItem>
                      <SelectItem value="nanosaur2">Nanosaur 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={formState.mode}
                    onValueChange={(newMode) => {
                      setFormState({
                        ...formState,
                        mode: newMode,
                        trackOrLevel: defaultTrackForMode(
                          formState.gameId,
                          newMode,
                        ),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {getModeOptions(formState.gameId).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Track / Level</Label>
                  <Select
                    value={formState.trackOrLevel}
                    onValueChange={(value) => {
                      setFormState({ ...formState, trackOrLevel: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select track or level" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTrackOptions(formState.gameId, formState.mode).map(
                        (opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Lobby Visibility</Label>
                  <Select
                    value={formState.isPublic ? "public" : "private"}
                    onValueChange={(value) => {
                      setFormState({
                        ...formState,
                        isPublic: value !== "private",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lobby visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (listed)</SelectItem>
                      <SelectItem value="private">
                        Private (invite only)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
          </div>

          {lobbyIntent === "join" && !lobby ? (
            <div className="space-y-2">
              <Label>Public Lobbies</Label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-2">
                {publicLobbies.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No public lobbies found for this game.
                  </div>
                ) : (
                  publicLobbies.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <div className="text-xs md:text-sm">
                        <div className="font-medium">
                          {item.gameId} {item.mode} ({item.trackOrLevel})
                        </div>
                        <div className="text-muted-foreground">
                          {item.playerCount}/{item.maxPlayers} players •{" "}
                          {item.joinCode}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                          busy ||
                          uiState === "preloading-game" ||
                          item.canJoin === false
                        }
                        onClick={() => {
                          void handleQuickJoinLobby(item.id);
                        }}
                      >
                        Join
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <Separator />

          <div className="flex flex-wrap gap-2">
            {lobbyIntent === "create" ? (
              <Button
                disabled={busy || uiState === "preloading-game"}
                onClick={() => void handleCreateLobby()}
              >
                Create Lobby
              </Button>
            ) : (
              <Button
                disabled={
                  busy ||
                  uiState === "preloading-game" ||
                  joinLobbyId.trim().length === 0
                }
                onClick={() => void handleJoinLobby()}
              >
                Join Lobby
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Session Status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <strong>Connection:</strong> {connectionStatus}
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <strong>Phase:</strong> {uiState}
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <strong>Data Channel:</strong> {rtcStatusText}
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 md:col-span-2">
            <strong>Status:</strong> {statusText}
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 md:col-span-2">
            <strong>Ping:</strong>{" "}
            {displayedPingMs === null ? "n/a" : `${displayedPingMs} ms`}
          </div>
          {errorText ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive md:col-span-2">
              <strong>Error:</strong> {errorText}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {activeMatchConfig ? (
        <Card className="border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
          <CardContent className="p-0">
            <div
              className="w-full overflow-hidden rounded-xl bg-black"
              style={{ aspectRatio: "4/3" }}
            >
              <canvas
                id="canvas"
                ref={gameCanvasRef}
                className="h-full w-full bg-black"
                aria-label="Multiplayer Game"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {lobby ? (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">Lobby Details</CardTitle>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={handleCopyLobbyId}
              >
                Copy Lobby ID
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <strong>Lobby ID:</strong> {lobby.id}
              </div>
              <div>
                <strong>Join Code:</strong> {lobby.joinCode}
              </div>
              <div>
                <strong>State:</strong> {lobby.state}
              </div>
              <div>
                <strong>You are:</strong> {isHost ? "host" : "guest"}
              </div>
              <div>
                <strong>Visibility:</strong>{" "}
                {lobby.isPublic ? "public" : "private"}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <strong>Roster</strong>
              <ul className="space-y-1">
                {lobby.players.map((player) => (
                  <li key={player.participantId}>
                    {player.playerIndex}: {player.displayName}{" "}
                    {player.isHost ? "(Host)" : ""}{" "}
                    {player.isReady ? "Ready" : "Not ready"} • {player.region} •{" "}
                    {player.pingMs} ms
                    {isHost && !player.isHost ? (
                      <Button
                        className="ml-2"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          void handleRemoveParticipant(player.participantId);
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="space-y-2">
              <strong>Lobby Chat</strong>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-2">
                {chatMessages.length === 0 ? (
                  <div className="text-muted-foreground">No messages yet.</div>
                ) : (
                  chatMessages.map((message, index) => (
                    <div
                      key={`${message.participantId}:${message.createdAt}:${index}`}
                    >
                      <strong>{message.displayName}:</strong> {message.message}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={chatDraft}
                  placeholder="Send a message"
                  onChange={(event) => {
                    setChatDraft(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSendChat();
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  disabled={chatDraft.trim().length === 0}
                  onClick={() => {
                    void handleSendChat();
                  }}
                >
                  Send
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || !localParticipant}
                onClick={() =>
                  void handleSetReady(!(localParticipant?.isReady ?? false))
                }
              >
                {localParticipant?.isReady ? "Set Not Ready" : "Set Ready"}
              </Button>
              <Button
                disabled={busy || !isHost}
                onClick={() => void handleStart()}
              >
                Host Start
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => void handleLeave()}
              >
                Leave Lobby
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {showDebugOverlay ? (
        <div className="fixed right-3 bottom-3 max-w-md rounded border border-emerald-700 bg-black/85 p-3 text-xs text-emerald-200 space-y-1">
          <div>
            <strong>Lobby:</strong> {lobby?.id ?? "none"}
          </div>
          <div>
            <strong>Join code:</strong> {lobby?.joinCode ?? "none"}
          </div>
          <div>
            <strong>Participant:</strong> {localParticipantId ?? "none"}
          </div>
          <div>
            <strong>Player index:</strong>{" "}
            {String(localParticipant?.playerIndex ?? -1)}
          </div>
          <div>
            <strong>Role:</strong> {isHost ? "host" : "client"}
          </div>
          <div>
            <strong>SignalR state:</strong> {connectionStatus}
          </div>
          <div>
            <strong>ICE state:</strong> n/a
          </div>
          <div>
            <strong>Data-channel state:</strong> n/a
          </div>
          <div>
            <strong>Packet counts:</strong> {JSON.stringify(packetCounts)}
          </div>
          <div>
            <strong>Last sent frame:</strong> n/a
          </div>
          <div>
            <strong>Last received frame:</strong> n/a
          </div>
          <div>
            <strong>Input delay:</strong> n/a
          </div>
          <div>
            <strong>Queued input frames:</strong> n/a
          </div>
          <div>
            <strong>Current game frame:</strong> n/a
          </div>
          <div>
            <strong>Last sync hash:</strong> n/a
          </div>
          <div>
            <strong>Last network error:</strong> {errorText ?? "none"}
          </div>
          <div>
            <strong>TURN relay usage:</strong> n/a
          </div>
        </div>
      ) : null}
    </div>
  );
}
