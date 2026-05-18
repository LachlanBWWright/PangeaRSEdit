using Microsoft.AspNetCore.Mvc;
using PangeaRSEdit.Api.Contracts;
using System.Security.Cryptography;
using System.Text;

namespace PangeaRSEdit.Api.Controllers;

[ApiController]
[Route("api/multiplayer/ice-servers")]
public sealed class MultiplayerIceController(IConfiguration configuration) : ControllerBase
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
    public IActionResult GetIceServers()
    {
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
            var username = $"{expiresAt}:{participantPrefix}";
            var credential = BuildTurnCredential(turnSharedSecret, username);
            servers.Add(new([turnUrl], username, credential));
        }

        var response = new MultiplayerIceServersResponse(
            servers
        );
        return Ok(response);
    }
}
