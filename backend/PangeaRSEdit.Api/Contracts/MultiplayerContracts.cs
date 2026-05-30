namespace PangeaRSEdit.Api.Contracts;

public sealed record CreateMultiplayerLobbyBody(
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    string DisplayName,
    int TagDurationMinutes = 3,
    bool IsPublic = true
);

public sealed record JoinMultiplayerLobbyBody(string DisplayName);

public sealed record SetMultiplayerLobbyReadyBody(bool IsReady);

public sealed record StartMultiplayerLobbyBody(bool Force = false);

public sealed record UpdateMultiplayerLobbySelectionBody(
    string Mode,
    string TrackOrLevel,
    int TagDurationMinutes = 3
);

public sealed record EndMultiplayerLobbyMatchBody(string? Detail);

public sealed record RematchMultiplayerLobbyBody(
    string GameId,
    string Mode,
    string TrackOrLevel,
    int TagDurationMinutes = 3,
    bool Force = false
);

public sealed record MultiplayerLobbyReportBody(string? Detail);

public sealed record MultiplayerMatchResultPlayerBody(
    string ParticipantId,
    int PlayerIndex,
    string DisplayName,
    string Team,
    int Placement,
    bool Finished,
    bool Eliminated,
    int Score,
    int TimeMs,
    int LapsCompleted,
    int Checkpoint
);

public sealed record MultiplayerMatchResultBody(
    Guid LobbyId,
    Guid MatchId,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int Seed,
    DateTimeOffset EndedAt,
    string EndReason,
    int WinnerPlayerIndex,
    string WinningTeam,
    IReadOnlyList<int> Placements,
    IReadOnlyList<MultiplayerMatchResultPlayerBody> Players
);

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
    string DisplayName,
    string ConnectionState
);

public sealed record MultiplayerMatchConfigResponse(
    Guid LobbyId,
    Guid MatchId,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int Seed,
    int TagDurationMinutes,
    int HostPlayerIndex,
    int MaxPlayers,
    int RequiredProtocolVersion,
    string RequiredRuntimeVersion,
    string HostParticipantId,
    IReadOnlyList<MultiplayerMatchConfigPlayerResponse> Players
);

public sealed record MultiplayerLobbySummaryResponse(
    Guid Id,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int TagDurationMinutes,
    int MaxPlayers,
    bool IsPublic,
    string JoinCode,
    string State,
    int PlayerCount,
    bool CanJoin,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt
);

public sealed record MultiplayerLobbiesListResponse(IReadOnlyList<MultiplayerLobbySummaryResponse> Items);

public sealed record MultiplayerLobbyDetailsResponse(
    Guid Id,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int TagDurationMinutes,
    int MaxPlayers,
    bool IsPublic,
    string HostParticipantId,
    string JoinCode,
    string State,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    IReadOnlyList<MultiplayerLobbyPlayerResponse> Players,
    string ParticipantId,
    MultiplayerMatchConfigResponse? MatchConfig,
    MultiplayerMatchResultBody? MatchResult
);

public sealed record MultiplayerLobbyPreviewResponse(
    Guid Id,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int TagDurationMinutes,
    int MaxPlayers,
    string State,
    int PlayerCount,
    bool CanJoin
);
