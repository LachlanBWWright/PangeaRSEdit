namespace PangeaRSEdit.Infrastructure.Persistence.Entities;

public sealed class SavedLevelEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Game { get; set; } = string.Empty;
    public string LevelKey { get; set; } = string.Empty;
    public string LevelName { get; set; } = string.Empty;
    public string SourceFileName { get; set; } = string.Empty;
    public long SourceFileSize { get; set; }
    public string SourceFileSha256 { get; set; } = string.Empty;
    public int PayloadFormatVersion { get; set; }
    public long PayloadSizeBytes { get; set; }
    public string PayloadSha256 { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public long RowVersion { get; set; }

    public UserProfileEntity User { get; set; } = null!;
}
