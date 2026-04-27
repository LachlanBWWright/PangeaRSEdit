using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Application.SavedLevels;
using PangeaRSEdit.Domain.Models;
using PangeaRSEdit.Infrastructure.Persistence;
using PangeaRSEdit.Infrastructure.Persistence.Entities;

namespace PangeaRSEdit.Infrastructure.SavedLevels;

public sealed class EfSavedLevelService(PangeaRSEditDbContext dbContext) : ISavedLevelService
{
    private const int MaxPayloadBytes = 8 * 1024 * 1024;

    public async Task<AppResult<IReadOnlyList<SavedLevelSummary>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.SavedLevels
            .Where(level => level.UserId == userId && level.DeletedAt == null)
            .OrderByDescending(level => level.UpdatedAt)
            .Select(level => new SavedLevelSummary(
                level.Id,
                level.Game,
                level.LevelKey,
                level.LevelName,
                level.SourceFileName,
                level.UpdatedAt,
                EncodeRowVersion(level.RowVersion)
            ))
            .Cast<SavedLevelSummary>()
            .ToListAsync(cancellationToken);

        return AppResult<IReadOnlyList<SavedLevelSummary>>.Success(items);
    }

    public async Task<AppResult<SavedLevelDetails>> GetAsync(
        Guid userId,
        Guid savedLevelId,
        CancellationToken cancellationToken)
    {
        var level = await dbContext.SavedLevels.SingleOrDefaultAsync(
            x => x.Id == savedLevelId && x.UserId == userId && x.DeletedAt == null,
            cancellationToken
        );
        if (level is null)
        {
            return AppResult<SavedLevelDetails>.Failure(AppErrors.SavedLevelNotFound);
        }

        return AppResult<SavedLevelDetails>.Success(new SavedLevelDetails(MapSavedLevel(level), EncodeRowVersion(level.RowVersion)));
    }

    public async Task<AppResult<SavedLevelDetails>> CreateAsync(
        CreateSavedLevelRequest request,
        CancellationToken cancellationToken)
    {
        if (request.PayloadFormatVersion != 1)
        {
            return AppResult<SavedLevelDetails>.Failure(AppErrors.PayloadUnsupportedVersion);
        }

        var payloadValidation = ValidatePayload(request.Game, request.LevelKey, request.PayloadJson);
        if (!payloadValidation.IsSuccess)
        {
            return AppResult<SavedLevelDetails>.Failure(payloadValidation.ErrorCode!);
        }

        var payloadBytes = Encoding.UTF8.GetByteCount(request.PayloadJson);
        if (payloadBytes > MaxPayloadBytes)
        {
            return AppResult<SavedLevelDetails>.Failure(AppErrors.PayloadTooLarge);
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new SavedLevelEntity
        {
            Id = Guid.CreateVersion7(),
            UserId = request.UserId,
            Game = request.Game,
            LevelKey = request.LevelKey,
            LevelName = request.LevelName,
            SourceFileName = request.SourceFileName,
            SourceFileSize = request.SourceFileSize,
            SourceFileSha256 = request.SourceFileSha256,
            PayloadFormatVersion = request.PayloadFormatVersion,
            PayloadSizeBytes = payloadBytes,
            PayloadSha256 = ComputeSha256(request.PayloadJson),
            Description = request.Description,
            PayloadJson = request.PayloadJson,
            CreatedAt = now,
            UpdatedAt = now,
            DeletedAt = null,
            RowVersion = 1
        };

        dbContext.SavedLevels.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return AppResult<SavedLevelDetails>.Success(new SavedLevelDetails(MapSavedLevel(entity), EncodeRowVersion(entity.RowVersion)));
    }

    public async Task<AppResult<SavedLevelDetails>> UpdateAsync(
        UpdateSavedLevelRequest request,
        CancellationToken cancellationToken)
    {
        var existing = await dbContext.SavedLevels.SingleOrDefaultAsync(
            x => x.Id == request.SavedLevelId && x.UserId == request.UserId && x.DeletedAt == null,
            cancellationToken
        );
        if (existing is null)
        {
            return AppResult<SavedLevelDetails>.Failure(AppErrors.SavedLevelNotFound);
        }

        var rowVersion = DecodeRowVersion(request.RowVersion);
        if (!rowVersion.IsSuccess || rowVersion.Value != existing.RowVersion)
        {
            return AppResult<SavedLevelDetails>.Failure(AppErrors.SavedLevelConflict);
        }

        if (request.PayloadFormatVersion != 1)
        {
            return AppResult<SavedLevelDetails>.Failure(AppErrors.PayloadUnsupportedVersion);
        }

        var payloadValidation = ValidatePayload(existing.Game, existing.LevelKey, request.PayloadJson);
        if (!payloadValidation.IsSuccess)
        {
            return AppResult<SavedLevelDetails>.Failure(payloadValidation.ErrorCode!);
        }

        var payloadBytes = Encoding.UTF8.GetByteCount(request.PayloadJson);
        if (payloadBytes > MaxPayloadBytes)
        {
            return AppResult<SavedLevelDetails>.Failure(AppErrors.PayloadTooLarge);
        }

        existing.LevelName = request.LevelName;
        existing.PayloadFormatVersion = request.PayloadFormatVersion;
        existing.PayloadJson = request.PayloadJson;
        existing.PayloadSizeBytes = payloadBytes;
        existing.PayloadSha256 = ComputeSha256(request.PayloadJson);
        existing.Description = request.Description;
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        existing.RowVersion += 1;

        await dbContext.SaveChangesAsync(cancellationToken);

        return AppResult<SavedLevelDetails>.Success(new SavedLevelDetails(MapSavedLevel(existing), EncodeRowVersion(existing.RowVersion)));
    }

    public async Task<AppResult<bool>> SoftDeleteAsync(
        Guid userId,
        Guid savedLevelId,
        CancellationToken cancellationToken)
    {
        var existing = await dbContext.SavedLevels.SingleOrDefaultAsync(
            x => x.Id == savedLevelId && x.UserId == userId && x.DeletedAt == null,
            cancellationToken
        );
        if (existing is null)
        {
            return AppResult<bool>.Failure(AppErrors.SavedLevelNotFound);
        }

        existing.DeletedAt = DateTimeOffset.UtcNow;
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        existing.RowVersion += 1;
        await dbContext.SaveChangesAsync(cancellationToken);

        return AppResult<bool>.Success(true);
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

            if (versionElement.GetInt32() != 1)
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

    private static SavedLevel MapSavedLevel(SavedLevelEntity entity)
    {
        return new SavedLevel(
            entity.Id,
            entity.UserId,
            entity.Game,
            entity.LevelKey,
            entity.LevelName,
            entity.SourceFileName,
            entity.SourceFileSize,
            entity.SourceFileSha256,
            entity.PayloadFormatVersion,
            entity.PayloadSizeBytes,
            entity.PayloadSha256,
            entity.Description,
            entity.PayloadJson,
            entity.CreatedAt,
            entity.UpdatedAt,
            entity.DeletedAt,
            entity.RowVersion
        );
    }
}
