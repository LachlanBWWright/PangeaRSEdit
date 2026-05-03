using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Domain.Models;

namespace PangeaRSEdit.Application.Auth;

public sealed record GoogleProfileInput(
    string Subject,
    string DisplayName,
    string Email,
    string AvatarUrl
);

public interface IUserProfileStore
{
    Task<AppResult<UserProfile>> UpsertGoogleProfileAsync(
        GoogleProfileInput input,
        CancellationToken cancellationToken);

    Task<AppResult<UserProfile>> GetByIdAsync(Guid userId, CancellationToken cancellationToken);
}
