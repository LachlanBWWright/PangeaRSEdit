using PangeaRSEdit.Application.Common;

namespace PangeaRSEdit.Application.SavedLevels;

public interface ISavedLevelService
{
    Task<AppResult<IReadOnlyList<SavedLevelSummary>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken);

    Task<AppResult<SavedLevelDetails>> GetAsync(
        Guid userId,
        Guid savedLevelId,
        CancellationToken cancellationToken);

    Task<AppResult<SavedLevelDetails>> CreateAsync(
        CreateSavedLevelRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<SavedLevelDetails>> UpdateAsync(
        UpdateSavedLevelRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<bool>> SoftDeleteAsync(
        Guid userId,
        Guid savedLevelId,
        CancellationToken cancellationToken);
}
