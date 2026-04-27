using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PangeaRSEdit.Api.Contracts;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Application.SavedLevels;
using PangeaRSEdit.Domain.Models;

namespace PangeaRSEdit.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/saved-levels")]
public sealed class SavedLevelsController(ISavedLevelService savedLevelService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ToProblem(AppErrors.AuthRequired));
        }

        var result = await savedLevelService.ListAsync(userId, cancellationToken);
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.AuthRequired);
        }

        var items = result.Value.Select(item =>
            new SavedLevelSummaryResponse(
                item.Id,
                item.Game,
                item.LevelKey,
                item.LevelName,
                item.SourceFileName,
                item.UpdatedAt,
                item.RowVersion
            )).ToList();

        return Ok(new SavedLevelsListResponse(items));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ToProblem(AppErrors.AuthRequired));
        }

        var result = await savedLevelService.GetAsync(userId, id, cancellationToken);
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.SavedLevelNotFound);
        }

        return Ok(MapDetails(result.Value.SavedLevel, result.Value.RowVersion));
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync(
        [FromBody] CreateSavedLevelBody body,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ToProblem(AppErrors.AuthRequired));
        }

        var result = await savedLevelService.CreateAsync(
            new CreateSavedLevelRequest(
                userId,
                body.Game,
                body.LevelKey,
                body.LevelName,
                body.SourceFileName,
                body.SourceFileSize,
                body.SourceFileSha256,
                body.PayloadFormatVersion,
                body.Payload,
                body.Description
            ),
            cancellationToken
        );

        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.PayloadInvalidJson);
        }

        return CreatedAtAction(nameof(GetAsync), new { id = result.Value.SavedLevel.Id }, MapDetails(result.Value.SavedLevel, result.Value.RowVersion));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAsync(
        Guid id,
        [FromBody] UpdateSavedLevelBody body,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ToProblem(AppErrors.AuthRequired));
        }

        var result = await savedLevelService.UpdateAsync(
            new UpdateSavedLevelRequest(
                userId,
                id,
                body.RowVersion,
                body.LevelName,
                body.PayloadFormatVersion,
                body.Payload,
                body.Description
            ),
            cancellationToken
        );

        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.SavedLevelConflict);
        }

        return Ok(MapDetails(result.Value.SavedLevel, result.Value.RowVersion));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ToProblem(AppErrors.AuthRequired));
        }

        var result = await savedLevelService.SoftDeleteAsync(userId, id, cancellationToken);
        if (!result.IsSuccess)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.SavedLevelNotFound);
        }

        return NoContent();
    }

    private bool TryGetUserId(out Guid userId)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out userId);
    }

    private IActionResult ToErrorStatus(string errorCode)
    {
        return errorCode switch
        {
            AppErrors.AuthRequired => Unauthorized(ToProblem(errorCode)),
            AppErrors.SavedLevelNotFound => NotFound(ToProblem(errorCode)),
            AppErrors.SavedLevelConflict => Conflict(ToProblem(errorCode)),
            AppErrors.PayloadTooLarge => StatusCode(StatusCodes.Status413PayloadTooLarge, ToProblem(errorCode)),
            AppErrors.PayloadUnsupportedVersion => BadRequest(ToProblem(errorCode)),
            AppErrors.PayloadMetadataMismatch => BadRequest(ToProblem(errorCode)),
            AppErrors.PayloadInvalidJson => BadRequest(ToProblem(errorCode)),
            _ => BadRequest(ToProblem(errorCode))
        };
    }

    private static ProblemCodeResponse ToProblem(string errorCode)
    {
        return new ProblemCodeResponse(errorCode, errorCode);
    }

    private static SavedLevelDetailsResponse MapDetails(SavedLevel level, string rowVersion)
    {
        return new SavedLevelDetailsResponse(
            level.Id,
            level.Game,
            level.LevelKey,
            level.LevelName,
            level.SourceFileName,
            level.SourceFileSize,
            level.SourceFileSha256,
            level.PayloadFormatVersion,
            level.PayloadSizeBytes,
            level.PayloadSha256,
            level.Description,
            level.PayloadJson,
            level.CreatedAt,
            level.UpdatedAt,
            rowVersion
        );
    }
}
