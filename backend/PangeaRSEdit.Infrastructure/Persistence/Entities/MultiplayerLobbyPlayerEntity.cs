namespace PangeaRSEdit.Infrastructure.Persistence.Entities;

public sealed class MultiplayerLobbyPlayerEntity
{
    public Guid Id { get; set; }
    public Guid LobbyId { get; set; }
    public string ParticipantId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int PlayerIndex { get; set; }
    public bool IsHost { get; set; }
    public bool IsReady { get; set; }
    public DateTimeOffset JoinedAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }

    public MultiplayerLobbyEntity Lobby { get; set; } = null!;
}
