using Microsoft.AspNetCore.Mvc;
using PangeaRSEdit.Api.Contracts;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Application.Multiplayer;

namespace PangeaRSEdit.Api.Controllers;

[ApiController]
[Route("api/multiplayer/lobbies")]
public sealed class MultiplayerLobbiesController(IMultiplayerLobbyService lobbyService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateLobbyAsync(
        [FromBody] CreateMultiplayerLobbyBody body,
        CancellationToken cancellationToken)
    {
        var participantId = GetOrCreateParticipantId();
        var result = await lobbyService.CreateLobbyAsync(
            new CreateLobbyRequest(
                body.GameId,
                body.Mode,
                body.TrackOrLevel,
                body.MaxPlayers,
                body.DisplayName,
                participantId
            ),
            cancellationToken
        );

        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        return Ok(MapDetails(result.Value, participantId));
    }

    [HttpGet]
    public async Task<IActionResult> ListLobbiesAsync([FromQuery] string gameId, CancellationToken cancellationToken)
    {
        var result = await lobbyService.ListLobbiesAsync(gameId, cancellationToken);
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        var items = result.Value.Select(x => new MultiplayerLobbySummaryResponse(
            x.Id,
            x.GameId,
            x.Mode,
            x.TrackOrLevel,
            x.MaxPlayers,
            x.JoinCode,
            x.State,
            x.PlayerCount,
            x.CreatedAt,
            x.ExpiresAt
        )).ToList();

        return Ok(new MultiplayerLobbiesListResponse(items));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetLobbyAsync(Guid id, CancellationToken cancellationToken)
    {
        var participantId = GetOrCreateParticipantId();
        var result = await lobbyService.GetLobbyAsync(id, cancellationToken);
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyNotFound);
        }

        return Ok(MapDetails(result.Value, participantId));
    }

    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> JoinLobbyAsync(
        Guid id,
        [FromBody] JoinMultiplayerLobbyBody body,
        CancellationToken cancellationToken)
    {
        var participantId = GetOrCreateParticipantId();
        var result = await lobbyService.JoinLobbyAsync(
            new JoinLobbyRequest(id, body.DisplayName, participantId),
            cancellationToken
        );
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        return Ok(MapDetails(result.Value, participantId));
    }

    [HttpPost("{id:guid}/leave")]
    public async Task<IActionResult> LeaveLobbyAsync(Guid id, CancellationToken cancellationToken)
    {
        var participantId = GetOrCreateParticipantId();
        var result = await lobbyService.LeaveLobbyAsync(new LeaveLobbyRequest(id, participantId), cancellationToken);
        if (!result.IsSuccess)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyForbidden);
        }

        return NoContent();
    }

    [HttpPost("{id:guid}/ready")]
    public async Task<IActionResult> SetReadyAsync(
        Guid id,
        [FromBody] SetMultiplayerLobbyReadyBody body,
        CancellationToken cancellationToken)
    {
        var participantId = GetOrCreateParticipantId();
        var result = await lobbyService.SetReadyAsync(
            new SetLobbyReadyRequest(id, participantId, body.IsReady),
            cancellationToken
        );
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        return Ok(MapDetails(result.Value, participantId));
    }

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> StartLobbyAsync(Guid id, CancellationToken cancellationToken)
    {
        var participantId = GetOrCreateParticipantId();
        var result = await lobbyService.StartLobbyAsync(new StartLobbyRequest(id, participantId), cancellationToken);
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        return Ok(MapDetails(result.Value, participantId));
    }

    private string GetOrCreateParticipantId()
    {
        var headerValue = Request.Headers["X-Participant-Id"].ToString();
        var participantId = string.IsNullOrWhiteSpace(headerValue) ? Guid.NewGuid().ToString("N") : headerValue;
        Response.Headers["X-Participant-Id"] = participantId;
        return participantId;
    }

    private IActionResult ToErrorStatus(string errorCode)
    {
        return errorCode switch
        {
            AppErrors.LobbyNotFound => NotFound(new ProblemCodeResponse(errorCode, errorCode)),
            AppErrors.LobbyForbidden => StatusCode(StatusCodes.Status403Forbidden, new ProblemCodeResponse(errorCode, errorCode)),
            AppErrors.LobbyFull => Conflict(new ProblemCodeResponse(errorCode, errorCode)),
            AppErrors.LobbyInvalidState => BadRequest(new ProblemCodeResponse(errorCode, errorCode)),
            _ => BadRequest(new ProblemCodeResponse(errorCode, errorCode))
        };
    }

    private static MultiplayerLobbyDetailsResponse MapDetails(MultiplayerLobbyDetails details, string participantId)
    {
        var players = details.Players.Select(x => new MultiplayerLobbyPlayerResponse(
            x.ParticipantId,
            x.DisplayName,
            x.PlayerIndex,
            x.IsHost,
            x.IsReady,
            x.JoinedAt,
            x.LastSeenAt
        )).ToList();

        return new MultiplayerLobbyDetailsResponse(
            details.Id,
            details.GameId,
            details.Mode,
            details.TrackOrLevel,
            details.MaxPlayers,
            details.HostParticipantId,
            details.JoinCode,
            details.State,
            details.CreatedAt,
            details.ExpiresAt,
            players,
            participantId
        );
    }
}
