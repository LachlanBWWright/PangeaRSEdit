using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PangeaRSEdit.Api.Contracts;
using PangeaRSEdit.Api.Security;
using PangeaRSEdit.Application.Multiplayer;
using System.Security.Cryptography;
using System.Text;

namespace PangeaRSEdit.Api.Controllers;

[ApiController]
[Route("api/multiplayer/ice-servers")]
[EnableRateLimiting("multiplayer-read")]
public sealed class MultiplayerIceController(
    IConfiguration configuration,
    ParticipantTokenService participantTokens,
    IMultiplayerLobbyService lobbyService) : ControllerBase
{
    private static string BuildTurnCredential(string sharedSecret, string username)
    {
        var keyBytes = Encoding.UTF8.GetBytes(sharedSecret);
        var usernameBytes = Encoding.UTF8.GetBytes(username);
        using var hmac = new HMACSHA1(keyBytes);
        var hash = hmac.ComputeHash(usernameBytes);
        return Convert.ToBase64String(hash);
    }

    [HttpGet]
    public async Task<IActionResult> GetIceServers(
        [FromQuery] Guid lobbyId,
        CancellationToken cancellationToken)
    {
        var participantToken = Request.Headers["X-Participant-Token"].ToString();
        var participantId = participantTokens.Validate(participantToken);
        if (participantId is null)
        {
            return Unauthorized();
        }

        var lobbyResult = await lobbyService.GetLobbyAsync(lobbyId, cancellationToken);
        if (!lobbyResult.IsSuccess || lobbyResult.Value is null)
        {
            return NotFound();
        }
        if (lobbyResult.Value.Players.All(player => player.ParticipantId != participantId))
        {
            return Forbid();
        }

        var stunUrl = configuration["Multiplayer:StunUrl"];
        if (string.IsNullOrWhiteSpace(stunUrl))
        {
            stunUrl = "stun:stun.l.google.com:19302";
        }

        var servers = new List<MultiplayerIceServerResponse>
        {
            new([stunUrl], null, null)
        };

        var turnUrl = configuration["Multiplayer:TurnUrl"];
        var turnSharedSecret = configuration["Multiplayer:TurnSharedSecret"];
        if (!string.IsNullOrWhiteSpace(turnUrl) && !string.IsNullOrWhiteSpace(turnSharedSecret))
        {
            var ttlSeconds = 600;
            var configuredTtl = configuration["Multiplayer:TurnCredentialTtlSeconds"];
            if (int.TryParse(configuredTtl, out var parsedTtl) && parsedTtl > 0)
            {
                ttlSeconds = parsedTtl;
            }
            var expiresAt = DateTimeOffset.UtcNow.AddSeconds(ttlSeconds).ToUnixTimeSeconds();
            var participantPrefix = configuration["Multiplayer:TurnParticipantPrefix"];
            if (string.IsNullOrWhiteSpace(participantPrefix))
            {
                participantPrefix = "pangea";
            }
            var username = $"{expiresAt}:{participantPrefix}:{participantId}";
            var credential = BuildTurnCredential(turnSharedSecret, username);
            servers.Add(new([turnUrl], username, credential));
        }

        var response = new MultiplayerIceServersResponse(
            servers
        );
        return Ok(response);
    }
}
