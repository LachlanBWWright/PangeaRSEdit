namespace PangeaRSEdit.Api.Contracts;

public sealed record ProfileResponse(
    Guid Id,
    string DisplayName,
    string Email,
    string AvatarUrl
);
