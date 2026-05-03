using Microsoft.EntityFrameworkCore;
using PangeaRSEdit.Application.Auth;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Domain.Models;
using PangeaRSEdit.Infrastructure.Persistence;
using PangeaRSEdit.Infrastructure.Persistence.Entities;

namespace PangeaRSEdit.Infrastructure.Auth;

public sealed class EfUserProfileStore(PangeaRSEditDbContext dbContext) : IUserProfileStore
{
    public async Task<AppResult<UserProfile>> UpsertGoogleProfileAsync(
        GoogleProfileInput input,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        const string provider = "google";

        var login = await dbContext.ExternalLogins
            .Include(x => x.User)
            .SingleOrDefaultAsync(
                x => x.Provider == provider && x.ProviderSubject == input.Subject,
                cancellationToken
            );

        if (login is not null)
        {
            login.User.DisplayName = input.DisplayName;
            login.User.Email = input.Email;
            login.User.AvatarUrl = input.AvatarUrl;
            login.User.UpdatedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);
            return AppResult<UserProfile>.Success(MapUser(login.User));
        }

        var user = new UserProfileEntity
        {
            Id = Guid.CreateVersion7(),
            DisplayName = input.DisplayName,
            Email = input.Email,
            AvatarUrl = input.AvatarUrl,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.UserProfiles.Add(user);
        dbContext.ExternalLogins.Add(new ExternalLoginEntity
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            Provider = provider,
            ProviderSubject = input.Subject,
            CreatedAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<UserProfile>.Success(MapUser(user));
    }

    public async Task<AppResult<UserProfile>> GetByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.UserProfiles.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null)
        {
            return AppResult<UserProfile>.Failure(AppErrors.AuthRequired);
        }

        return AppResult<UserProfile>.Success(MapUser(user));
    }

    private static UserProfile MapUser(UserProfileEntity user)
    {
        return new UserProfile(user.Id, user.DisplayName, user.Email, user.AvatarUrl, user.CreatedAt, user.UpdatedAt);
    }
}
