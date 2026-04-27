namespace PangeaRSEdit.Infrastructure.Persistence.Entities;

public sealed class UserProfileEntity
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<ExternalLoginEntity> ExternalLogins { get; set; } = new List<ExternalLoginEntity>();
    public ICollection<SavedLevelEntity> SavedLevels { get; set; } = new List<SavedLevelEntity>();
}
