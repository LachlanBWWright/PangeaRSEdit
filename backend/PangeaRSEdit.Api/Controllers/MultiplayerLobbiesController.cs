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
                body.IsPublic,
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
    public async Task<IActionResult> ListLobbiesAsync([FromQuery] string? gameId, CancellationToken cancellationToken)
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
            x.IsPublic,
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

    [HttpGet("{id:guid}/preview")]
    public async Task<IActionResult> GetLobbyPreviewAsync(Guid id, CancellationToken cancellationToken)
    {
        var result = await lobbyService.GetLobbyAsync(id, cancellationToken);
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyNotFound);
        }

        var details = result.Value;
        var canJoin =
            details.State == "open"
            && details.ExpiresAt > DateTimeOffset.UtcNow
            && details.Players.Count < details.MaxPlayers;
        return Ok(new MultiplayerLobbyPreviewResponse(
            details.Id,
            details.GameId,
            details.Mode,
            details.TrackOrLevel,
            details.MaxPlayers,
            details.State,
            details.Players.Count,
            canJoin
        ));
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

    [HttpPost("{id:guid}/heartbeat")]
    public async Task<IActionResult> HeartbeatAsync(Guid id, CancellationToken cancellationToken)
    {
        var participantId = GetOrCreateParticipantId();
        var result = await lobbyService.HeartbeatAsync(
            new LobbyHeartbeatRequest(id, participantId),
            cancellationToken
        );
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        return Ok(MapDetails(result.Value, participantId));
    }

    [HttpPost("{id:guid}/report/match-ended")]
    public async Task<IActionResult> ReportMatchEndedAsync(
        Guid id,
        [FromBody] MultiplayerLobbyReportBody body,
        CancellationToken cancellationToken)
    {
        return await ReportEventAsync(id, "match-ended", body.Detail, cancellationToken);
    }

    [HttpPost("{id:guid}/report/participant-disconnected")]
    public async Task<IActionResult> ReportParticipantDisconnectedAsync(
        Guid id,
        [FromBody] MultiplayerLobbyReportBody body,
        CancellationToken cancellationToken)
    {
        return await ReportEventAsync(id, "participant-disconnected", body.Detail, cancellationToken);
    }

    [HttpPost("{id:guid}/report/host-disconnected")]
    public async Task<IActionResult> ReportHostDisconnectedAsync(
        Guid id,
        [FromBody] MultiplayerLobbyReportBody body,
        CancellationToken cancellationToken)
    {
        return await ReportEventAsync(id, "host-disconnected", body.Detail, cancellationToken);
    }

    [HttpPost("{id:guid}/report/desync")]
    public async Task<IActionResult> ReportDesyncAsync(
        Guid id,
        [FromBody] MultiplayerLobbyReportBody body,
        CancellationToken cancellationToken)
    {
        return await ReportEventAsync(id, "desync-reported", body.Detail, cancellationToken);
    }

    [HttpPost("{id:guid}/report/timeout")]
    public async Task<IActionResult> ReportTimeoutAsync(
        Guid id,
        [FromBody] MultiplayerLobbyReportBody body,
        CancellationToken cancellationToken)
    {
        return await ReportEventAsync(id, "timeout-reported", body.Detail, cancellationToken);
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

    private async Task<IActionResult> ReportEventAsync(
        Guid id,
        string eventType,
        string? detail,
        CancellationToken cancellationToken)
    {
        var participantId = GetOrCreateParticipantId();
        var result = await lobbyService.ReportEventAsync(
            new LobbyReportEventRequest(id, participantId, eventType, detail),
            cancellationToken
        );
        if (!result.IsSuccess || result.Value is null)
        {
            return ToErrorStatus(result.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        return Ok(MapDetails(result.Value, participantId));
    }

    private static MultiplayerLobbyDetailsResponse MapDetails(MultiplayerLobbyDetails details, string participantId)
    {
        var players = details.Players.Select(x => new MultiplayerLobbyPlayerResponse(
            x.ParticipantId,
            x.DisplayName,
            x.PlayerIndex,
            x.IsHost,
            x.IsReady,
            x.Region,
            x.PingMs,
            x.JoinedAt,
            x.LastSeenAt
        )).ToList();

        var matchConfig = details.MatchConfig is null
            ? null
            : new MultiplayerMatchConfigResponse(
                details.MatchConfig.LobbyId,
                details.MatchConfig.MatchId,
                details.MatchConfig.GameId,
                details.MatchConfig.Mode,
                details.MatchConfig.TrackOrLevel,
                details.MatchConfig.Seed,
                details.MatchConfig.HostPlayerIndex,
                details.MatchConfig.MaxPlayers,
                details.MatchConfig.RequiredProtocolVersion,
                details.MatchConfig.RequiredRuntimeVersion,
                details.MatchConfig.HostParticipantId,
                details.MatchConfig.Players.Select(x => new MultiplayerMatchConfigPlayerResponse(
                    x.ParticipantId,
                    x.PlayerIndex,
                    x.DisplayName,
                    x.ConnectionState
                )).ToList()
            );

        return new MultiplayerLobbyDetailsResponse(
            details.Id,
            details.GameId,
            details.Mode,
            details.TrackOrLevel,
            details.MaxPlayers,
            details.IsPublic,
            details.HostParticipantId,
            details.JoinCode,
            details.State,
            details.CreatedAt,
            details.ExpiresAt,
            players,
            participantId,
            matchConfig
        );
    }
}
