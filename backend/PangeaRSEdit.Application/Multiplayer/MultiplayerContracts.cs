namespace PangeaRSEdit.Application.Multiplayer;

public sealed record CreateLobbyRequest(
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    int TagDurationMinutes,
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
    string ParticipantId,
    bool Force
);

public sealed record UpdateLobbySelectionRequest(
    Guid LobbyId,
    string ParticipantId,
    string Mode,
    string TrackOrLevel,
    int TagDurationMinutes
);

public sealed record EndLobbyMatchRequest(
    Guid LobbyId,
    string ParticipantId,
    string Detail
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

public sealed record RematchLobbyRequest(
    Guid LobbyId,
    string ParticipantId,
    string GameId,
    string Mode,
    string TrackOrLevel,
    int TagDurationMinutes,
    bool Force
);

public sealed record MultiplayerMatchResultPlayer(
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

public sealed record MultiplayerMatchResult(
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
    IReadOnlyList<MultiplayerMatchResultPlayer> Players
);

public sealed record LobbyReportMatchResultRequest(
    Guid LobbyId,
    string ParticipantId,
    MultiplayerMatchResult Result
);

public sealed record MultiplayerLobbySummary(
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
    int TagDurationMinutes,
    int HostPlayerIndex,
    int MaxPlayers,
    int RequiredProtocolVersion,
    string RequiredRuntimeVersion,
    string RequiredContentHash,
    string HostParticipantId,
    IReadOnlyList<MultiplayerMatchConfigPlayer> Players
);

public sealed record MultiplayerLobbyDetails(
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
    IReadOnlyList<MultiplayerLobbyPlayer> Players,
    MultiplayerMatchConfig? MatchConfig,
    MultiplayerMatchResult? MatchResult
);
