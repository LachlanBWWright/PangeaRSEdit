namespace PangeaRSEdit.Domain.Models;

public sealed record UserProfile(
    Guid Id,
    string DisplayName,
    string Email,
    string AvatarUrl,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
