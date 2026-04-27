namespace PangeaRSEdit.Infrastructure.Persistence.Entities;

public sealed class ExternalLoginEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string ProviderSubject { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public UserProfileEntity User { get; set; } = null!;
}
