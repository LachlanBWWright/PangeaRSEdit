using System.Collections.Concurrent;
using PangeaRSEdit.Application.Auth;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Domain.Models;

namespace PangeaRSEdit.Infrastructure.Auth;

public sealed class InMemoryUserProfileStore : IUserProfileStore
{
    private readonly ConcurrentDictionary<string, UserProfile> _profilesByGoogleSubject =
        new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<Guid, UserProfile> _profilesById = new();

    public Task<AppResult<UserProfile>> UpsertGoogleProfileAsync(
        GoogleProfileInput input,
        CancellationToken cancellationToken)
    {
        var existing = _profilesByGoogleSubject.GetValueOrDefault(input.Subject);
        var now = DateTimeOffset.UtcNow;

        if (existing is not null)
        {
            var updated = existing with
            {
                DisplayName = input.DisplayName,
                Email = input.Email,
                AvatarUrl = input.AvatarUrl,
                UpdatedAt = now
            };
            _profilesByGoogleSubject[input.Subject] = updated;
            _profilesById[updated.Id] = updated;
            return Task.FromResult(AppResult<UserProfile>.Success(updated));
        }

        var created = new UserProfile(
            Guid.CreateVersion7(),
            input.DisplayName,
            input.Email,
            input.AvatarUrl,
            now,
            now
        );

        _profilesByGoogleSubject[input.Subject] = created;
        _profilesById[created.Id] = created;

        return Task.FromResult(AppResult<UserProfile>.Success(created));
    }

    public Task<AppResult<UserProfile>> GetByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        var profile = _profilesById.GetValueOrDefault(userId);
        return Task.FromResult(
            profile is null
                ? AppResult<UserProfile>.Failure(AppErrors.AuthRequired)
                : AppResult<UserProfile>.Success(profile)
        );
    }
}
