import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { ResultAsync, ok, err } from "neverthrow";
import { buildApiUrl } from "@/api/apiBase";
import type { MultiplayerLobbyDetails } from "./types";

export interface MultiplayerHubEvents {
  onPeerJoined: (participantId: string) => void;
  onPeerLeft: (participantId: string) => void;
  onPeerDisconnected: (participantId: string) => void;
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
  onMatchStarting: (lobbyId: string, matchConfig: unknown) => void;
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
        this.events.onMatchStarting?.(lobbyId, matchConfig);
      },
    );
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

  notifyMatchStarting(
    lobbyId: string,
    matchConfig: unknown,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke("NotifyMatchStarting", lobbyId, matchConfig),
      (e) => ({
        type: "hub" as const,
        message:
          e instanceof Error ? e.message : "Failed to notify match starting.",
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
