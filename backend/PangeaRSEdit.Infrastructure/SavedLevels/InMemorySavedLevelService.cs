using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Application.SavedLevels;
using PangeaRSEdit.Domain.Models;

namespace PangeaRSEdit.Infrastructure.SavedLevels;

public sealed class InMemorySavedLevelService : ISavedLevelService
{
    private const int MaxPayloadBytes = 8 * 1024 * 1024;

    private readonly ConcurrentDictionary<Guid, SavedLevel> _savedLevels = new();

    public Task<AppResult<IReadOnlyList<SavedLevelSummary>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var items = _savedLevels
            .Values
            .Where(level => level.UserId == userId && level.DeletedAt is null)
            .OrderByDescending(level => level.UpdatedAt)
            .Select(MapSummary)
            .Cast<SavedLevelSummary>()
            .ToList();

        return Task.FromResult(AppResult<IReadOnlyList<SavedLevelSummary>>.Success(items));
    }

    public Task<AppResult<SavedLevelDetails>> GetAsync(
        Guid userId,
        Guid savedLevelId,
        CancellationToken cancellationToken)
    {
        var level = _savedLevels.GetValueOrDefault(savedLevelId);
        if (level is null || level.UserId != userId || level.DeletedAt is not null)
        {
            return Task.FromResult(AppResult<SavedLevelDetails>.Failure(AppErrors.SavedLevelNotFound));
        }

        return Task.FromResult(
            AppResult<SavedLevelDetails>.Success(new SavedLevelDetails(level, EncodeRowVersion(level.RowVersion)))
        );
    }

    public Task<AppResult<SavedLevelDetails>> CreateAsync(
        CreateSavedLevelRequest request,
        CancellationToken cancellationToken)
    {
        if (request.PayloadFormatVersion != 1)
        {
            return Task.FromResult(
                AppResult<SavedLevelDetails>.Failure(AppErrors.PayloadUnsupportedVersion)
            );
        }

        var payloadValidation = ValidatePayload(request.Game, request.LevelKey, request.PayloadJson);
        if (!payloadValidation.IsSuccess)
        {
            return Task.FromResult(AppResult<SavedLevelDetails>.Failure(payloadValidation.ErrorCode!));
        }

        var payloadBytes = Encoding.UTF8.GetByteCount(request.PayloadJson);
        if (payloadBytes > MaxPayloadBytes)
        {
            return Task.FromResult(AppResult<SavedLevelDetails>.Failure(AppErrors.PayloadTooLarge));
        }

        var now = DateTimeOffset.UtcNow;
        var level = new SavedLevel(
            Guid.CreateVersion7(),
            request.UserId,
            request.Game,
            request.LevelKey,
            request.LevelName,
            request.SourceFileName,
            request.SourceFileSize,
            request.SourceFileSha256,
            request.PayloadFormatVersion,
            payloadBytes,
            ComputeSha256(request.PayloadJson),
            request.Description,
            request.PayloadJson,
            now,
            now,
            null,
            1
        );

        _savedLevels[level.Id] = level;

        return Task.FromResult(
            AppResult<SavedLevelDetails>.Success(new SavedLevelDetails(level, EncodeRowVersion(level.RowVersion)))
        );
    }

    public Task<AppResult<SavedLevelDetails>> UpdateAsync(
        UpdateSavedLevelRequest request,
        CancellationToken cancellationToken)
    {
        var existing = _savedLevels.GetValueOrDefault(request.SavedLevelId);
        if (existing is null || existing.UserId != request.UserId || existing.DeletedAt is not null)
        {
            return Task.FromResult(AppResult<SavedLevelDetails>.Failure(AppErrors.SavedLevelNotFound));
        }

        var rowVersion = DecodeRowVersion(request.RowVersion);
        if (!rowVersion.IsSuccess)
        {
            return Task.FromResult(AppResult<SavedLevelDetails>.Failure(AppErrors.SavedLevelConflict));
        }

        if (rowVersion.Value != existing.RowVersion)
        {
            return Task.FromResult(AppResult<SavedLevelDetails>.Failure(AppErrors.SavedLevelConflict));
        }

        if (request.PayloadFormatVersion != 1)
        {
            return Task.FromResult(
                AppResult<SavedLevelDetails>.Failure(AppErrors.PayloadUnsupportedVersion)
            );
        }

        var payloadValidation = ValidatePayload(existing.Game, existing.LevelKey, request.PayloadJson);
        if (!payloadValidation.IsSuccess)
        {
            return Task.FromResult(AppResult<SavedLevelDetails>.Failure(payloadValidation.ErrorCode!));
        }

        var payloadBytes = Encoding.UTF8.GetByteCount(request.PayloadJson);
        if (payloadBytes > MaxPayloadBytes)
        {
            return Task.FromResult(AppResult<SavedLevelDetails>.Failure(AppErrors.PayloadTooLarge));
        }

        var updated = existing with
        {
            LevelName = request.LevelName,
            PayloadFormatVersion = request.PayloadFormatVersion,
            PayloadJson = request.PayloadJson,
            PayloadSizeBytes = payloadBytes,
            PayloadSha256 = ComputeSha256(request.PayloadJson),
            Description = request.Description,
            UpdatedAt = DateTimeOffset.UtcNow,
            RowVersion = existing.RowVersion + 1
        };

        _savedLevels[updated.Id] = updated;

        return Task.FromResult(
            AppResult<SavedLevelDetails>.Success(new SavedLevelDetails(updated, EncodeRowVersion(updated.RowVersion)))
        );
    }

    public Task<AppResult<bool>> SoftDeleteAsync(
        Guid userId,
        Guid savedLevelId,
        CancellationToken cancellationToken)
    {
        var existing = _savedLevels.GetValueOrDefault(savedLevelId);
        if (existing is null || existing.UserId != userId || existing.DeletedAt is not null)
        {
            return Task.FromResult(AppResult<bool>.Failure(AppErrors.SavedLevelNotFound));
        }

        _savedLevels[savedLevelId] = existing with
        {
            DeletedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            RowVersion = existing.RowVersion + 1
        };

        return Task.FromResult(AppResult<bool>.Success(true));
    }

    private static SavedLevelSummary MapSummary(SavedLevel level)
    {
        return new SavedLevelSummary(
            level.Id,
            level.Game,
            level.LevelKey,
            level.LevelName,
            level.SourceFileName,
            level.UpdatedAt,
            EncodeRowVersion(level.RowVersion)
        );
    }

    private static AppResult<bool> ValidatePayload(string game, string levelKey, string payloadJson)
    {
        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(payloadJson);
        }
        catch (JsonException)
        {
            return AppResult<bool>.Failure(AppErrors.PayloadInvalidJson);
        }

        using (document)
        {
            var root = document.RootElement;
            if (!root.TryGetProperty("version", out var versionElement) || versionElement.ValueKind != JsonValueKind.Number)
            {
                return AppResult<bool>.Failure(AppErrors.PayloadUnsupportedVersion);
            }

            var version = versionElement.GetInt32();
            if (version != 1)
            {
                return AppResult<bool>.Failure(AppErrors.PayloadUnsupportedVersion);
            }

            if (!root.TryGetProperty("game", out var gameElement) || gameElement.ValueKind != JsonValueKind.String)
            {
                return AppResult<bool>.Failure(AppErrors.PayloadMetadataMismatch);
            }

            if (!root.TryGetProperty("levelKey", out var levelKeyElement) || levelKeyElement.ValueKind != JsonValueKind.String)
            {
                return AppResult<bool>.Failure(AppErrors.PayloadMetadataMismatch);
            }

            var payloadGame = gameElement.GetString();
            var payloadLevelKey = levelKeyElement.GetString();
            if (!string.Equals(payloadGame, game, StringComparison.Ordinal)
                || !string.Equals(payloadLevelKey, levelKey, StringComparison.Ordinal))
            {
                return AppResult<bool>.Failure(AppErrors.PayloadMetadataMismatch);
            }
        }

        return AppResult<bool>.Success(true);
    }

    private static string ComputeSha256(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static string EncodeRowVersion(long value)
    {
        return Convert.ToBase64String(BitConverter.GetBytes(value));
    }

    private static AppResult<long> DecodeRowVersion(string value)
    {
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(value);
        }
        catch (FormatException)
        {
            return AppResult<long>.Failure(AppErrors.SavedLevelConflict);
        }

        if (bytes.Length != sizeof(long))
        {
            return AppResult<long>.Failure(AppErrors.SavedLevelConflict);
        }

        return AppResult<long>.Success(BitConverter.ToInt64(bytes, 0));
    }
}
