namespace PangeaRSEdit.Domain.Models;

public sealed record SavedLevel(
    Guid Id,
    Guid UserId,
    string Game,
    string LevelKey,
    string LevelName,
    string SourceFileName,
    long SourceFileSize,
    string SourceFileSha256,
    int PayloadFormatVersion,
    long PayloadSizeBytes,
    string PayloadSha256,
    string Description,
    string PayloadJson,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    long RowVersion
);
