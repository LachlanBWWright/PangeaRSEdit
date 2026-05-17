using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PangeaRSEdit.Application.Multiplayer;

namespace PangeaRSEdit.Infrastructure.Multiplayer;

public sealed class MultiplayerLobbyCleanupHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<MultiplayerLobbyCleanupHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();
            var lobbyService = scope.ServiceProvider.GetRequiredService<IMultiplayerLobbyService>();
            await lobbyService.CleanupExpiredAndStaleAsync(stoppingToken);

            try
            {
                await Task.Delay(CleanupInterval, stoppingToken);
            }
            catch (TaskCanceledException exception)
            {
                logger.LogDebug(exception, "Lobby cleanup service stopping");
                break;
            }
        }
    }
}
