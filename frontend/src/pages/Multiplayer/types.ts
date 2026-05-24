import type { RefObject } from "react";
import type {
  MultiplayerLobbyDetails,
  MultiplayerLobbySummary,
} from "@/multiplayer/types";
import type {
  MultiplayerNetworkDebugOptions,
  MultiplayerRuntimeDebugStats,
} from "@/multiplayer/runtimeBridge";
import type { NativeVisualDebugStats } from "@/multiplayer/nativeVisualDebugStats";
import type {
  JoinGameFilter,
  JoinModeFilter,
  LobbyFormState,
} from "@/multiplayer/menuOptions";

export interface LobbyChatMessage {
  readonly lobbyId: string;
  readonly participantId: string;
  readonly displayName: string;
  readonly message: string;
  readonly createdAt: string;
}

export type MultiplayerUiState =
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

export interface LobbyBrowserProps {
  readonly isCreateLobbyOpen: boolean;
  readonly formState: LobbyFormState;
  readonly joinLobbyId: string;
  readonly busy: boolean;
  readonly isPreloading: boolean;
  readonly lobbyListErrorText: string | null;
  readonly displayedPublicLobbies: readonly MultiplayerLobbySummary[];
  readonly joinGameFilter: JoinGameFilter;
  readonly joinModeFilter: JoinModeFilter;
  readonly onCreateLobbyOpenChange: (open: boolean) => void;
  readonly onFormStateChange: (nextState: LobbyFormState) => void;
  readonly onJoinLobbyIdChange: (nextLobbyId: string) => void;
  readonly onJoinGameFilterChange: (
    nextFilter: JoinGameFilter,
  ) => void;
  readonly onJoinModeFilterChange: (nextFilter: JoinModeFilter) => void;
  readonly onRefreshLobbies: () => void;
  readonly onCreateLobby: () => void;
  readonly onJoinLobby: () => void;
  readonly onQuickJoinLobby: (lobbyId: string) => void;
}

export interface MultiplayerSessionViewProps {
  readonly lobby: MultiplayerLobbyDetails;
  readonly activeMatchConfigPresent: boolean;
  readonly showDebugOverlay: boolean;
  readonly localParticipantId: string | null;
  readonly localPlayerIndex: number | null;
  readonly connectionStatus: string;
  readonly currentMatchPhase: string;
  readonly rtcStatusText: string;
  readonly displayedPingMs: number | null;
  readonly currentMatchKind: string;
  readonly hudLabel: string;
  readonly statusText: string;
  readonly errorText: string | null;
  readonly isHost: boolean;
  readonly readyPlayerCount: number;
  readonly busy: boolean;
  readonly chatMessages: readonly LobbyChatMessage[];
  readonly chatDraft: string;
  readonly localParticipantIsReady: boolean;
  readonly hasLocalParticipant: boolean;
  readonly canStartLobby: boolean;
  readonly canForceStartLobby: boolean;
  readonly packetCounts: Readonly<Record<string, number>>;
  readonly runtimeDebugStats: MultiplayerRuntimeDebugStats;
  readonly nativeDebugStats: NativeVisualDebugStats;
  readonly networkDebugOptions: MultiplayerNetworkDebugOptions;
  readonly gameCanvasRef: RefObject<HTMLCanvasElement | null>;
  readonly onCopyLobbyId: () => void;
  readonly onRemoveParticipant: (participantId: string) => void;
  readonly onChatDraftChange: (nextDraft: string) => void;
  readonly onSendChat: () => void;
  readonly onToggleReady: () => void;
  readonly onStart: () => void;
  readonly onStartAnyway: () => void;
  readonly onLeave: () => void;
  readonly onResetNetworkDebugOptions: () => void;
  readonly onUpdateNetworkDebugOption: (
    key: keyof MultiplayerNetworkDebugOptions,
    value: number,
  ) => void;
}

export interface MultiplayerDebugOverlayProps {
  readonly lobby: MultiplayerLobbyDetails | null;
  readonly localParticipantId: string | null;
  readonly localPlayerIndex: number | null;
  readonly isHost: boolean;
  readonly connectionStatus: string;
  readonly rtcStatusText: string;
  readonly packetCounts: Readonly<Record<string, number>>;
  readonly runtimeDebugStats: MultiplayerRuntimeDebugStats;
  readonly nativeDebugStats: NativeVisualDebugStats;
  readonly errorText: string | null;
}
