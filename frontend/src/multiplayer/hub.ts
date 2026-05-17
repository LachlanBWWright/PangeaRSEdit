import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { ResultAsync, ok, err } from "neverthrow";
import { buildApiUrl } from "@/api/apiBase";
import {
  MultiplayerLobbyDetailsSchema,
  MultiplayerMatchConfigSchema,
} from "./schemas";
import type { MultiplayerLobbyDetails, MultiplayerMatchConfig } from "./types";

export interface MultiplayerHubEvents {
  onPeerJoined: (participantId: string) => void;
  onPeerLeft: (participantId: string) => void;
  onPeerDisconnected: (participantId: string) => void;
  onHostDisconnected: (participantId: string) => void;
  onParticipantDisconnected: (participantId: string) => void;
  onReceiveOffer: (fromId: string, targetId: string, sdp: string) => void;
  onReceiveAnswer: (fromId: string, targetId: string, sdp: string) => void;
  onReceiveIceCandidate: (
    fromId: string,
    targetId: string,
    candidate: string,
  ) => void;
  onPlayerReadyChanged: (
    participantId: string,
    isReady: boolean,
    lobby: MultiplayerLobbyDetails,
  ) => void;
  onMatchStarting: (
    lobbyId: string,
    matchConfig: MultiplayerMatchConfig,
  ) => void;
  onLobbyParticipantsChanged: (lobby: MultiplayerLobbyDetails) => void;
  onRemovedFromLobby: (lobbyId: string, participantId: string) => void;
  onLobbyChatMessage: (
    lobbyId: string,
    participantId: string,
    displayName: string,
    message: string,
    createdAt: string,
  ) => void;
  onRuntimeLevelReady: (
    lobbyId: string,
    participantId: string,
  ) => void;
  onRuntimeStartNow: (lobbyId: string) => void;
}

export interface MultiplayerHubError {
  readonly type: "connection" | "hub" | "timeout";
  readonly message: string;
}

const HUB_URL = buildApiUrl("/api/multiplayer/signaling");
const RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000];

export class MultiplayerHubClient {
  private connection: HubConnection;
  private events: Partial<MultiplayerHubEvents>;

  constructor(events: Partial<MultiplayerHubEvents> = {}) {
    this.events = events;
    this.connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect(RECONNECT_DELAYS_MS)
      .configureLogging(LogLevel.Warning)
      .build();

    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.connection.on("PeerJoined", (participantId: string) => {
      this.events.onPeerJoined?.(participantId);
    });

    this.connection.on("PeerLeft", (participantId: string) => {
      this.events.onPeerLeft?.(participantId);
    });

    this.connection.on("PeerDisconnected", (participantId: string) => {
      this.events.onPeerDisconnected?.(participantId);
    });

    this.connection.on("HostDisconnected", (participantId: string) => {
      this.events.onHostDisconnected?.(participantId);
    });

    this.connection.on("ParticipantDisconnected", (participantId: string) => {
      this.events.onParticipantDisconnected?.(participantId);
    });

    this.connection.on(
      "ReceiveOffer",
      (fromId: string, targetId: string, sdp: string) => {
        this.events.onReceiveOffer?.(fromId, targetId, sdp);
      },
    );

    this.connection.on(
      "ReceiveAnswer",
      (fromId: string, targetId: string, sdp: string) => {
        this.events.onReceiveAnswer?.(fromId, targetId, sdp);
      },
    );

    this.connection.on(
      "ReceiveIceCandidate",
      (fromId: string, targetId: string, candidate: string) => {
        this.events.onReceiveIceCandidate?.(fromId, targetId, candidate);
      },
    );

    this.connection.on(
      "PlayerReadyChanged",
      (
        participantId: string,
        isReady: boolean,
        lobby: MultiplayerLobbyDetails,
      ) => {
        this.events.onPlayerReadyChanged?.(participantId, isReady, lobby);
      },
    );

    this.connection.on(
      "MatchStarting",
      (lobbyId: string, matchConfig: unknown) => {
        const parsed = MultiplayerMatchConfigSchema.safeParse(matchConfig);
        if (!parsed.success) {
          return;
        }
        this.events.onMatchStarting?.(lobbyId, parsed.data);
      },
    );

    this.connection.on("LobbyParticipantsChanged", (lobby: unknown) => {
      const parsed = MultiplayerLobbyDetailsSchema.safeParse(lobby);
      if (!parsed.success) {
        return;
      }
      this.events.onLobbyParticipantsChanged?.(parsed.data);
    });

    this.connection.on(
      "RemovedFromLobby",
      (lobbyId: string, participantId: string) => {
        this.events.onRemovedFromLobby?.(lobbyId, participantId);
      },
    );

    this.connection.on(
      "LobbyChatMessage",
      (
        lobbyId: string,
        participantId: string,
        displayName: string,
        message: string,
        createdAt: string,
      ) => {
        this.events.onLobbyChatMessage?.(
          lobbyId,
          participantId,
          displayName,
          message,
          createdAt,
        );
      },
    );

    this.connection.on(
      "RuntimeLevelReady",
      (lobbyId: string, participantId: string) => {
        this.events.onRuntimeLevelReady?.(lobbyId, participantId);
      },
    );

    this.connection.on("RuntimeStartNow", (lobbyId: string) => {
      this.events.onRuntimeStartNow?.(lobbyId);
    });
  }

  connect(): ResultAsync<void, MultiplayerHubError> {
    if (this.connection.state !== HubConnectionState.Disconnected) {
      return ResultAsync.fromSafePromise(Promise.resolve());
    }

    return ResultAsync.fromPromise(this.connection.start(), (e) => ({
      type: "connection" as const,
      message:
        e instanceof Error
          ? e.message
          : "Failed to connect to signaling server.",
    }));
  }

  disconnect(): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(this.connection.stop(), (e) => ({
      type: "connection" as const,
      message:
        e instanceof Error
          ? e.message
          : "Error disconnecting from signaling server.",
    }));
  }

  joinLobby(
    lobbyId: string,
    participantId: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("JoinLobby", lobbyId, participantId),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error
            ? e.message
            : "Failed to join lobby signaling group.",
      }),
    );
  }

  leaveLobby(lobbyId: string): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("LeaveLobby", lobbyId),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error
            ? e.message
            : "Failed to leave lobby signaling group.",
      }),
    );
  }

  sendOffer(
    lobbyId: string,
    targetParticipantId: string,
    sdp: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("SendOffer", lobbyId, targetParticipantId, sdp),
      (e) => ({
        type: "hub" as const,
        message: e instanceof Error ? e.message : "Failed to send offer.",
      }),
    );
  }

  sendAnswer(
    lobbyId: string,
    targetParticipantId: string,
    sdp: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("SendAnswer", lobbyId, targetParticipantId, sdp),
      (e) => ({
        type: "hub" as const,
        message: e instanceof Error ? e.message : "Failed to send answer.",
      }),
    );
  }

  sendIceCandidate(
    lobbyId: string,
    targetParticipantId: string,
    candidate: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke(
        "SendIceCandidate",
        lobbyId,
        targetParticipantId,
        candidate,
      ),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error ? e.message : "Failed to send ICE candidate.",
      }),
    );
  }

  setReady(
    lobbyId: string,
    isReady: boolean,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("SetReady", lobbyId, isReady),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error ? e.message : "Failed to update ready state.",
      }),
    );
  }

  notifyMatchStarting(lobbyId: string): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("NotifyMatchStarting", lobbyId),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error ? e.message : "Failed to notify match starting.",
      }),
    );
  }

  removeParticipant(
    lobbyId: string,
    targetParticipantId: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("RemoveParticipant", lobbyId, targetParticipantId),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error ? e.message : "Failed to remove participant.",
      }),
    );
  }

  sendLobbyChat(
    lobbyId: string,
    message: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("SendLobbyChat", lobbyId, message),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error ? e.message : "Failed to send chat message.",
      }),
    );
  }

  reportRuntimeLevelReady(
    lobbyId: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("ReportRuntimeLevelReady", lobbyId),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error ? e.message : "Failed to report runtime readiness.",
      }),
    );
  }

  notifyRuntimeStartNow(
    lobbyId: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("NotifyRuntimeStartNow", lobbyId),
      (e) => ({
        type: "hub" as const,
        message: e instanceof Error ? e.message : "Failed to notify runtime start.",
      }),
    );
  }

  reportPing(
    lobbyId: string,
    pingMs: number,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("ReportPing", lobbyId, pingMs),
      (e) => ({
        type: "hub" as const,
        message: e instanceof Error ? e.message : "Failed to report ping.",
      }),
    );
  }

  ping(nowMs: number): ResultAsync<number, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<number>("Ping", nowMs),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error ? e.message : "Failed to ping signaling hub.",
      }),
    );
  }

  get state(): HubConnectionState {
    return this.connection.state;
  }

  isConnected(): boolean {
    return this.connection.state === HubConnectionState.Connected;
  }
}

/** Create a hub client that connects automatically and joins a lobby. */
export function createAndConnectHubClient(
  lobbyId: string,
  participantId: string,
  events: Partial<MultiplayerHubEvents>,
): ResultAsync<MultiplayerHubClient, MultiplayerHubError> {
  const client = new MultiplayerHubClient(events);
  return client
    .connect()
    .andThen(() => client.joinLobby(lobbyId, participantId))
    .map(() => client);
}

// Re-export for convenience
export { ok, err };
