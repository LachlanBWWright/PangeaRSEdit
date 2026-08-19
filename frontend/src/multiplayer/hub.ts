import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { ResultAsync, ok, err, type Result } from "neverthrow";
import { buildApiUrl } from "@/api/apiBase";
import {
  HubBooleanResultSchema,
  HubThrownErrorSchema,
  MultiplayerLobbyDetailsSchema,
  MultiplayerMatchConfigSchema,
} from "./schemas";
import type { MultiplayerLobbyDetails, MultiplayerMatchConfig } from "./types";
import { getParticipantToken } from "./api";
import { MultiplayerReconnectPolicy } from "./reconnectPolicy";

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
function toHubError(error: unknown, fallbackMessage: string): MultiplayerHubError {
  const parsed = HubThrownErrorSchema.safeParse(error);

  return {
    type: "hub",
    message: parsed.success ? parsed.data.message : fallbackMessage,
  };
}

function parseHubBooleanResult(
  value: unknown,
  fallbackMessage: string,
): Result<void, MultiplayerHubError> {
  const parsed = HubBooleanResultSchema.safeParse(value);
  if (!parsed.success) {
    return err({
      type: "hub",
      message: fallbackMessage,
    });
  }

  if (parsed.data.errorCode) {
    return err({
      type: "hub",
      message: parsed.data.errorCode,
    });
  }

  return ok(undefined);
}

export class MultiplayerHubClient {
  private connection: HubConnection;
  private events: Partial<MultiplayerHubEvents>;
  private activeLobby: {
    readonly lobbyId: string;
    readonly participantId: string;
  } | null = null;

  constructor(events: Partial<MultiplayerHubEvents> = {}) {
    this.events = events;
    this.connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        withCredentials: true,
        accessTokenFactory: getParticipantToken,
      })
      .withAutomaticReconnect(new MultiplayerReconnectPolicy())
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.onreconnected(() => {
      const activeLobby = this.activeLobby;
      if (activeLobby === null) {
        return;
      }

      void this.joinLobby(activeLobby.lobbyId, activeLobby.participantId);
    });

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
      this.connection.invoke<unknown>("JoinLobby", lobbyId, participantId),
      (e) => toHubError(e, "Failed to join lobby signaling group."),
    )
      .andThen((value) =>
        parseHubBooleanResult(value, "Failed to join lobby signaling group."),
      )
      .map(() => {
        this.activeLobby = { lobbyId, participantId };
      });
  }

  leaveLobby(lobbyId: string): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("LeaveLobby", lobbyId),
      (e) => toHubError(e, "Failed to leave lobby signaling group."),
    )
      .andThen((value) =>
        parseHubBooleanResult(value, "Failed to leave lobby signaling group."),
      )
      .map(() => {
        this.activeLobby = null;
      });
  }

  sendOffer(
    lobbyId: string,
    targetParticipantId: string,
    sdp: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("SendOffer", lobbyId, targetParticipantId, sdp),
      (e) => toHubError(e, "Failed to send offer."),
    ).andThen((value) => parseHubBooleanResult(value, "Failed to send offer."));
  }

  sendAnswer(
    lobbyId: string,
    targetParticipantId: string,
    sdp: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("SendAnswer", lobbyId, targetParticipantId, sdp),
      (e) => toHubError(e, "Failed to send answer."),
    ).andThen((value) => parseHubBooleanResult(value, "Failed to send answer."));
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
      (e) => toHubError(e, "Failed to send ICE candidate."),
    ).andThen((value) =>
      parseHubBooleanResult(value, "Failed to send ICE candidate."),
    );
  }

  setReady(
    lobbyId: string,
    isReady: boolean,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("SetReady", lobbyId, isReady),
      (e) => toHubError(e, "Failed to update ready state."),
    ).andThen((value) =>
      parseHubBooleanResult(value, "Failed to update ready state."),
    );
  }

  notifyMatchStarting(lobbyId: string): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("NotifyMatchStarting", lobbyId),
      (e) => toHubError(e, "Failed to notify match starting."),
    ).andThen((value) =>
      parseHubBooleanResult(value, "Failed to notify match starting."),
    );
  }

  removeParticipant(
    lobbyId: string,
    targetParticipantId: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("RemoveParticipant", lobbyId, targetParticipantId),
      (e) => toHubError(e, "Failed to remove participant."),
    ).andThen((value) =>
      parseHubBooleanResult(value, "Failed to remove participant."),
    );
  }

  sendLobbyChat(
    lobbyId: string,
    message: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("SendLobbyChat", lobbyId, message),
      (e) => toHubError(e, "Failed to send chat message."),
    ).andThen((value) =>
      parseHubBooleanResult(value, "Failed to send chat message."),
    );
  }

  reportRuntimeLevelReady(
    lobbyId: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("ReportRuntimeLevelReady", lobbyId),
      (e) => toHubError(e, "Failed to report runtime readiness."),
    ).andThen((value) =>
      parseHubBooleanResult(value, "Failed to report runtime readiness."),
    );
  }

  notifyRuntimeStartNow(
    lobbyId: string,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("NotifyRuntimeStartNow", lobbyId),
      (e) => toHubError(e, "Failed to notify runtime start."),
    ).andThen((value) =>
      parseHubBooleanResult(value, "Failed to notify runtime start."),
    );
  }

  reportPing(
    lobbyId: string,
    pingMs: number,
  ): ResultAsync<void, MultiplayerHubError> {
    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("ReportPing", lobbyId, pingMs),
      (e) => toHubError(e, "Failed to report ping."),
    ).andThen((value) => parseHubBooleanResult(value, "Failed to report ping."));
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
