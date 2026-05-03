using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using PangeaRSEdit.Api.Contracts;
using PangeaRSEdit.Application.Auth;

namespace PangeaRSEdit.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    IUserProfileStore userProfileStore,
    IAuthenticationSchemeProvider schemeProvider
) : ControllerBase
{
    [HttpGet("google/sign-in")]
    public async Task<IActionResult> GoogleSignIn([FromQuery] string? returnUrl)
    {
        var googleScheme = await schemeProvider.GetSchemeAsync(GoogleDefaults.AuthenticationScheme);
        if (googleScheme is null)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ProblemCodeResponse("auth.googleNotConfigured", "Google OAuth is not configured.")
            );
        }

        var safeReturnUrl = NormalizeReturnUrl(returnUrl);
        var authProperties = new AuthenticationProperties
        {
            RedirectUri = Url.ActionLink(nameof(GoogleCallback), values: new { returnUrl = safeReturnUrl })
        };

        return Challenge(authProperties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback(
        [FromQuery] AuthCallbackQuery query,
        CancellationToken cancellationToken)
    {
        var externalAuth = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);
        if (!externalAuth.Succeeded || externalAuth.Principal is null)
        {
            return Unauthorized(new ProblemCodeResponse("auth.required", "Google sign in failed."));
        }

        var subject = externalAuth.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        if (string.IsNullOrWhiteSpace(subject))
        {
            return Unauthorized(new ProblemCodeResponse("auth.required", "Google subject claim was missing."));
        }

        var email = externalAuth.Principal.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        var displayName = externalAuth.Principal.FindFirstValue(ClaimTypes.Name) ?? email;
        var avatarUrl = externalAuth.Principal.FindFirstValue("picture") ?? string.Empty;

        var profileResult = await userProfileStore.UpsertGoogleProfileAsync(
            new GoogleProfileInput(subject, displayName, email, avatarUrl),
            cancellationToken
        );
        if (!profileResult.IsSuccess || profileResult.Value is null)
        {
            return Unauthorized(new ProblemCodeResponse("auth.required", "Unable to establish user profile."));
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, profileResult.Value.Id.ToString()),
            new(ClaimTypes.Name, profileResult.Value.DisplayName),
            new(ClaimTypes.Email, profileResult.Value.Email)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
        await HttpContext.SignOutAsync(GoogleDefaults.AuthenticationScheme);

        return Redirect(NormalizeReturnUrl(query.ReturnUrl));
    }

    [HttpPost("sign-out")]
    public async Task<IActionResult> SignOutAsync()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private static string NormalizeReturnUrl(string? returnUrl)
    {
        return string.IsNullOrWhiteSpace(returnUrl) ? "/" : returnUrl;
    }
}
