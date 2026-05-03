namespace PangeaRSEdit.Api.Contracts;

public sealed record SavedLevelsListResponse(IReadOnlyList<SavedLevelSummaryResponse> Items);

public sealed record SavedLevelSummaryResponse(
    Guid Id,
    string Game,
    string LevelKey,
    string LevelName,
    string SourceFileName,
    DateTimeOffset UpdatedAt,
    string RowVersion
);

public sealed record SavedLevelDetailsResponse(
    Guid Id,
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
    string Payload,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    string RowVersion
);

public sealed record CreateSavedLevelBody(
    string Game,
    string LevelKey,
    string LevelName,
    string SourceFileName,
    long SourceFileSize,
    string SourceFileSha256,
    int PayloadFormatVersion,
    string Payload,
    string Description
);

public sealed record UpdateSavedLevelBody(
    string RowVersion,
    string LevelName,
    int PayloadFormatVersion,
    string Payload,
    string Description
);
