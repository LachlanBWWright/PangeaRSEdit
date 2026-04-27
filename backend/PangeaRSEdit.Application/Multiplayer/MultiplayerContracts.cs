namespace PangeaRSEdit.Application.Multiplayer;

public sealed record CreateLobbyRequest(
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    string DisplayName,
    string ParticipantId
);

public sealed record JoinLobbyRequest(
    Guid LobbyId,
    string DisplayName,
    string ParticipantId
);

public sealed record LeaveLobbyRequest(
    Guid LobbyId,
    string ParticipantId
);

public sealed record SetLobbyReadyRequest(
    Guid LobbyId,
    string ParticipantId,
    bool IsReady
);

public sealed record StartLobbyRequest(
    Guid LobbyId,
    string ParticipantId
);

public sealed record MultiplayerLobbySummary(
    Guid Id,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    string JoinCode,
    string State,
    int PlayerCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt
);

public sealed record MultiplayerLobbyPlayer(
    string ParticipantId,
    string DisplayName,
    int PlayerIndex,
    bool IsHost,
    bool IsReady,
    DateTimeOffset JoinedAt,
    DateTimeOffset LastSeenAt
);

public sealed record MultiplayerLobbyDetails(
    Guid Id,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    string HostParticipantId,
    string JoinCode,
    string State,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    IReadOnlyList<MultiplayerLobbyPlayer> Players
);
