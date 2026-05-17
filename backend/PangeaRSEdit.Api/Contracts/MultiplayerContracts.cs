namespace PangeaRSEdit.Api.Contracts;

public sealed record CreateMultiplayerLobbyBody(
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    string DisplayName,
    bool IsPublic = true
);

public sealed record JoinMultiplayerLobbyBody(string DisplayName);

public sealed record SetMultiplayerLobbyReadyBody(bool IsReady);

public sealed record MultiplayerLobbyReportBody(string? Detail);

public sealed record MultiplayerIceServerResponse(
    IReadOnlyList<string> Urls,
    string? Username,
    string? Credential
);

public sealed record MultiplayerIceServersResponse(
    IReadOnlyList<MultiplayerIceServerResponse> IceServers
);

public sealed record MultiplayerLobbyPlayerResponse(
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

public sealed record MultiplayerMatchConfigPlayerResponse(
    string ParticipantId,
    int PlayerIndex,
    string DisplayName
);

public sealed record MultiplayerMatchConfigResponse(
    Guid MatchId,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int Seed,
    string HostParticipantId,
    IReadOnlyList<MultiplayerMatchConfigPlayerResponse> Players
);

public sealed record MultiplayerLobbySummaryResponse(
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

public sealed record MultiplayerLobbiesListResponse(IReadOnlyList<MultiplayerLobbySummaryResponse> Items);

public sealed record MultiplayerLobbyDetailsResponse(
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
    IReadOnlyList<MultiplayerLobbyPlayerResponse> Players,
    string ParticipantId,
    MultiplayerMatchConfigResponse? MatchConfig
);

public sealed record MultiplayerLobbyPreviewResponse(
    Guid Id,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    string State,
    int PlayerCount,
    bool CanJoin
);
