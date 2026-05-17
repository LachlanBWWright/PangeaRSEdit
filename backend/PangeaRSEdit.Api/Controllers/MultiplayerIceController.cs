using Microsoft.AspNetCore.Mvc;
using PangeaRSEdit.Api.Contracts;

namespace PangeaRSEdit.Api.Controllers;

[ApiController]
[Route("api/multiplayer/ice-servers")]
public sealed class MultiplayerIceController(IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    public IActionResult GetIceServers()
    {
        var stunUrl = configuration["Multiplayer:StunUrl"];
        if (string.IsNullOrWhiteSpace(stunUrl))
        {
            stunUrl = "stun:stun.l.google.com:19302";
        }

        var response = new MultiplayerIceServersResponse(
            new List<MultiplayerIceServerResponse>
            {
                new([stunUrl], null, null)
            }
        );
        return Ok(response);
    }
}
