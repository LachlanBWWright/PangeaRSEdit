using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PangeaRSEdit.Api.Hubs;
using PangeaRSEdit.Api.Security;
using PangeaRSEdit.Infrastructure;
using PangeaRSEdit.Infrastructure.Persistence;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
var isMigrationMode = args.Contains("--migrate", StringComparer.Ordinal);

var configurationErrors = ValidateProductionConfiguration(
    builder.Environment,
    builder.Configuration,
    isMigrationMode);
if (configurationErrors.Count > 0)
{
    foreach (var configurationError in configurationErrors)
    {
        Console.Error.WriteLine(configurationError);
    }

    Environment.ExitCode = 1;
    return;
}

builder.Services.AddControllers();
builder.Services.AddSingleton<ParticipantTokenService>();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddPangeaInfrastructure(builder.Configuration);
builder.Services.AddHealthChecks()
    .AddDbContextCheck<PangeaRSEditDbContext>("database");
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("multiplayer-read", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 600,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.AddPolicy("multiplayer-write", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.AddPolicy("multiplayer-hub", context =>
        RateLimitPartition.GetTokenBucketLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = 600,
                TokensPerPeriod = 300,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            }));
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

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
                    .WithExposedHeaders("X-Participant-Id", "X-Participant-Token")
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

if (isMigrationMode)
{
    await using var migrationScope = app.Services.CreateAsyncScope();
    var migrationDb = migrationScope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
    await migrationDb.Database.MigrateAsync();
    return;
}

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    await using var initializationScope = app.Services.CreateAsyncScope();
    var initializationDb = initializationScope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
    await initializationDb.Database.EnsureCreatedAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseForwardedHeaders();
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}
app.UseCors("frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/healthz");
app.MapHub<MultiplayerHub>("/api/multiplayer/signaling")
    .RequireRateLimiting("multiplayer-hub");
app.MapHub<LspHub>("/api/lsp");

app.Run();

static IReadOnlyList<string> ValidateProductionConfiguration(
    IWebHostEnvironment environment,
    IConfiguration configuration,
    bool isMigrationMode)
{
    if (!environment.IsProduction())
    {
        return [];
    }

    var errors = new List<string>();
    if (!string.Equals(configuration["Database:Provider"], "postgres", StringComparison.OrdinalIgnoreCase))
    {
        errors.Add("Production requires Database__Provider=postgres.");
    }

    if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("Default")))
    {
        errors.Add("Production requires ConnectionStrings__Default.");
    }

    if (isMigrationMode)
    {
        return errors;
    }

    if (configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() is not { Length: > 0 })
    {
        errors.Add("Production requires at least one Cors__AllowedOrigins entry.");
    }

    if (string.IsNullOrWhiteSpace(configuration["Multiplayer:TurnUrl"])
        || string.IsNullOrWhiteSpace(configuration["Multiplayer:TurnSharedSecret"]))
    {
        errors.Add("Production multiplayer requires TURN URL and shared secret configuration.");
    }

    if (string.IsNullOrWhiteSpace(configuration["Multiplayer:ParticipantSigningKey"]))
    {
        errors.Add("Production multiplayer requires a participant signing key.");
    }

    return errors;
}

public partial class Program;
