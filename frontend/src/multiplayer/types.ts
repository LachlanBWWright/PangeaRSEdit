export interface MultiplayerLobbyPlayer {
  readonly participantId: string;
  readonly displayName: string;
  readonly playerIndex: number;
  readonly isHost: boolean;
  readonly isReady: boolean;
  readonly joinedAt: string;
  readonly lastSeenAt: string;
}

export interface MultiplayerLobbySummary {
  readonly id: string;
  readonly gameId: string;
  readonly mode: string;
  readonly trackOrLevel: string;
  readonly maxPlayers: number;
  readonly joinCode: string;
  readonly state: string;
  readonly playerCount: number;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface MultiplayerLobbyDetails {
  readonly id: string;
  readonly gameId: string;
  readonly mode: string;
  readonly trackOrLevel: string;
  readonly maxPlayers: number;
  readonly hostParticipantId: string;
  readonly joinCode: string;
  readonly state: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly players: readonly MultiplayerLobbyPlayer[];
  readonly participantId: string;
}

export interface CreateLobbyInput {
  readonly gameId: string;
  readonly mode: string;
  readonly trackOrLevel: string;
  readonly maxPlayers: number;
  readonly displayName: string;
}

export interface JoinLobbyInput {
  readonly lobbyId: string;
  readonly displayName: string;
}

export interface SetReadyInput {
  readonly lobbyId: string;
  readonly isReady: boolean;
}

export interface StartLobbyInput {
  readonly lobbyId: string;
}

export interface ListLobbiesInput {
  readonly gameId: string;
}

export interface MultiplayerApiError {
  readonly code: string;
  readonly message: string;
  readonly status: number;
}
