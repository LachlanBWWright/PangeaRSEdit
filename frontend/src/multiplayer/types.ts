/** Represents one player currently joined to a multiplayer lobby. */
export interface MultiplayerLobbyPlayer {
  readonly participantId: string;
  readonly displayName: string;
  readonly playerIndex: number;
  readonly isHost: boolean;
  readonly isReady: boolean;
  readonly joinedAt: string;
  readonly lastSeenAt: string;
}

/** Compact lobby metadata returned by lobby list endpoints. */
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

/** Full lobby details including the current participant roster. */
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

/** Request body used when creating a new multiplayer lobby. */
export interface CreateLobbyInput {
  readonly gameId: string;
  readonly mode: string;
  readonly trackOrLevel: string;
  readonly maxPlayers: number;
  readonly displayName: string;
}

/** Request body used when joining an existing lobby. */
export interface JoinLobbyInput {
  readonly lobbyId: string;
  readonly displayName: string;
}

/** Request body used to toggle a player's ready state. */
export interface SetReadyInput {
  readonly lobbyId: string;
  readonly isReady: boolean;
}

/** Request body used to start a lobby. */
export interface StartLobbyInput {
  readonly lobbyId: string;
}

/** Query input used when listing lobbies for a game. */
export interface ListLobbiesInput {
  readonly gameId: string;
}

/** Standard error shape returned by the multiplayer API layer. */
export interface MultiplayerApiError {
  readonly code: string;
  readonly message: string;
  readonly status: number;
}
