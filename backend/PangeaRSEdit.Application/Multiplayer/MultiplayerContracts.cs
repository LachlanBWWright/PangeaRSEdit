namespace PangeaRSEdit.Application.Multiplayer;

public sealed record CreateLobbyRequest(
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    string DisplayName,
    bool IsPublic,
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

public sealed record RemoveLobbyParticipantRequest(
    Guid LobbyId,
    string RequestingParticipantId,
    string TargetParticipantId
);

public sealed record LobbyHeartbeatRequest(
    Guid LobbyId,
    string ParticipantId
);

public sealed record LobbyReportEventRequest(
    Guid LobbyId,
    string ParticipantId,
    string EventType,
    string? Detail
);

public sealed record MultiplayerLobbySummary(
    Guid Id,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    bool IsPublic,
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
    string Region,
    int PingMs,
    DateTimeOffset JoinedAt,
    DateTimeOffset LastSeenAt
);

public sealed record MultiplayerMatchConfigPlayer(
    string ParticipantId,
    int PlayerIndex,
    string DisplayName,
    string ConnectionState
);

public sealed record MultiplayerMatchConfig(
    Guid LobbyId,
    Guid MatchId,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int Seed,
    int HostPlayerIndex,
    int MaxPlayers,
    int RequiredProtocolVersion,
    string RequiredRuntimeVersion,
    string HostParticipantId,
    IReadOnlyList<MultiplayerMatchConfigPlayer> Players
);

public sealed record MultiplayerLobbyDetails(
    Guid Id,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    bool IsPublic,
    string HostParticipantId,
    string JoinCode,
    string State,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    IReadOnlyList<MultiplayerLobbyPlayer> Players,
    MultiplayerMatchConfig? MatchConfig
);
