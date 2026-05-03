namespace PangeaRSEdit.Application.Common;

public readonly record struct AppResult<T>(T? Value, string? ErrorCode)
{
    public bool IsSuccess => ErrorCode is null;

    public static AppResult<T> Success(T value)
    {
        return new AppResult<T>(value, null);
    }

    public static AppResult<T> Failure(string errorCode)
    {
        return new AppResult<T>(default, errorCode);
    }
}

public static class AppErrors
{
    public const string AuthRequired = "auth.required";
    public const string SavedLevelNotFound = "savedLevel.notFound";
    public const string SavedLevelConflict = "savedLevel.conflict";
    public const string PayloadTooLarge = "payload.tooLarge";
    public const string PayloadUnsupportedVersion = "payload.unsupportedVersion";
    public const string PayloadMetadataMismatch = "payload.metadataMismatch";
    public const string PayloadInvalidJson = "payload.invalidJson";
    public const string LobbyNotFound = "lobby.notFound";
    public const string LobbyFull = "lobby.full";
    public const string LobbyInvalidState = "lobby.invalidState";
    public const string LobbyForbidden = "lobby.forbidden";
}
