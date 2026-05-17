namespace PangeaRSEdit.Infrastructure.Persistence.Entities;

public sealed class MultiplayerLobbyEntity
{
    public Guid Id { get; set; }
    public string GameId { get; set; } = string.Empty;
    public string Mode { get; set; } = string.Empty;
    public string TrackOrLevel { get; set; } = string.Empty;
    public int MaxPlayers { get; set; }
    public string HostParticipantId { get; set; } = string.Empty;
    public string JoinCode { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public Guid? MatchId { get; set; }
    public int? MatchSeed { get; set; }
    public DateTimeOffset? MatchStartedAt { get; set; }
    public DateTimeOffset? MatchEndedAt { get; set; }
    public string? LastReportType { get; set; }
    public string? LastReportDetail { get; set; }
    public string? LastReportByParticipantId { get; set; }
    public DateTimeOffset? LastReportAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }

    public ICollection<MultiplayerLobbyPlayerEntity> Players { get; set; } = new List<MultiplayerLobbyPlayerEntity>();
}
