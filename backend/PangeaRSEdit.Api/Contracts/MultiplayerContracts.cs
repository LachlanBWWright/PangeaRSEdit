namespace PangeaRSEdit.Api.Contracts;

public sealed record CreateMultiplayerLobbyBody(
    string GameId,
    string Mode,
    string TrackOrLevel,
    int MaxPlayers,
    string DisplayName
);

public sealed record JoinMultiplayerLobbyBody(string DisplayName);

public sealed record SetMultiplayerLobbyReadyBody(bool IsReady);

public sealed record MultiplayerLobbyPlayerResponse(
    string ParticipantId,
    string DisplayName,
    int PlayerIndex,
    bool IsHost,
    bool IsReady,
    DateTimeOffset JoinedAt,
    DateTimeOffset LastSeenAt
);

public sealed record MultiplayerLobbySummaryResponse(
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

public sealed record MultiplayerLobbiesListResponse(IReadOnlyList<MultiplayerLobbySummaryResponse> Items);

public sealed record MultiplayerLobbyDetailsResponse(
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
    IReadOnlyList<MultiplayerLobbyPlayerResponse> Players,
    string ParticipantId
);
