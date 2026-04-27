using Microsoft.AspNetCore.Mvc;

namespace PangeaRSEdit.Api.Controllers;

[ApiController]
[Route("healthz")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { status = "ok" });
    }
}
