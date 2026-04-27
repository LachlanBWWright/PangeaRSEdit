using PangeaRSEdit.Domain.Models;

namespace PangeaRSEdit.Application.SavedLevels;

public sealed record CreateSavedLevelRequest(
    Guid UserId,
    string Game,
    string LevelKey,
    string LevelName,
    string SourceFileName,
    long SourceFileSize,
    string SourceFileSha256,
    int PayloadFormatVersion,
    string PayloadJson,
    string Description
);

public sealed record UpdateSavedLevelRequest(
    Guid UserId,
    Guid SavedLevelId,
    string RowVersion,
    string LevelName,
    int PayloadFormatVersion,
    string PayloadJson,
    string Description
);

public sealed record SavedLevelSummary(
    Guid Id,
    string Game,
    string LevelKey,
    string LevelName,
    string SourceFileName,
    DateTimeOffset UpdatedAt,
    string RowVersion
);

public sealed record SavedLevelDetails(
    SavedLevel SavedLevel,
    string RowVersion
);
