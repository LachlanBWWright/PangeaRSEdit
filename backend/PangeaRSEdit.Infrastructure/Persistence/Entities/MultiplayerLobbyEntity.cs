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
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }

    public ICollection<MultiplayerLobbyPlayerEntity> Players { get; set; } = new List<MultiplayerLobbyPlayerEntity>();
}
