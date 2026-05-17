using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using PangeaRSEdit.Api.Hubs;
using PangeaRSEdit.Infrastructure;
using PangeaRSEdit.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddPangeaInfrastructure(builder.Configuration);

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var allowedOrigins = new HashSet<string>(corsOrigins, StringComparer.OrdinalIgnoreCase);
builder.Services
    .AddCors(options =>
    {
        options.AddPolicy(
            "frontend",
            policy =>
            {
                policy
                    .SetIsOriginAllowed(origin =>
                    {
                        if (allowedOrigins.Contains(origin))
                        {
                            return true;
                        }

                        if (!builder.Environment.IsDevelopment())
                        {
                            return false;
                        }

                        if (!Uri.TryCreate(origin, UriKind.Absolute, out var parsedOrigin))
                        {
                            return false;
                        }

                        return string.Equals(parsedOrigin.Host, "localhost", StringComparison.OrdinalIgnoreCase)
                            || string.Equals(parsedOrigin.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase);
                    })
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .WithExposedHeaders("X-Participant-Id")
                    .AllowCredentials();
            }
        );
    });

builder
    .Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    })
    .AddCookie(options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy =
            builder.Environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;
        options.Events.OnRedirectToLogin = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }

            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }

            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        };
    });

var googleClientId = builder.Configuration["Authentication:Google:ClientId"] ?? string.Empty;
var googleClientSecret =
    builder.Configuration["Authentication:Google:ClientSecret"] ?? string.Empty;

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    builder.Services
        .AddAuthentication()
        .AddGoogle(options =>
        {
            options.ClientId = googleClientId;
            options.ClientSecret = googleClientSecret;
            options.CallbackPath = "/api/auth/google/callback";
        });
}

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<MultiplayerHub>("/api/multiplayer/signaling");

app.Run();

public partial class Program;
