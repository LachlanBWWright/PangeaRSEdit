using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PangeaRSEdit.Api.Contracts;
using PangeaRSEdit.Application.Auth;

namespace PangeaRSEdit.Api.Controllers;

[ApiController]
[Route("api/me")]
public sealed class MeController(IUserProfileStore userProfileStore) : ControllerBase
{
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetAsync(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new ProblemCodeResponse("auth.required", "Authentication is required."));
        }

        var result = await userProfileStore.GetByIdAsync(userId, cancellationToken);
        if (!result.IsSuccess || result.Value is null)
        {
            return Unauthorized(new ProblemCodeResponse("auth.required", "Authentication is required."));
        }

        var profile = result.Value;
        return Ok(new ProfileResponse(profile.Id, profile.DisplayName, profile.Email, profile.AvatarUrl));
    }
}
