using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using PangeaRSEdit.Application.Auth;
using PangeaRSEdit.Application.Multiplayer;
using PangeaRSEdit.Application.SavedLevels;
using PangeaRSEdit.Infrastructure.Auth;
using PangeaRSEdit.Infrastructure.Multiplayer;
using PangeaRSEdit.Infrastructure.Persistence;
using PangeaRSEdit.Infrastructure.SavedLevels;

namespace PangeaRSEdit.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddPangeaInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"] ?? "sqlite";
        var connectionString = configuration.GetConnectionString("Default") ?? "Data Source=./pangearsedit-dev.db";

        services.AddDbContext<PangeaRSEditDbContext>(options =>
        {
            if (string.Equals(provider, "postgres", StringComparison.OrdinalIgnoreCase))
            {
                options.UseNpgsql(connectionString);
                return;
            }

            options.UseSqlite(connectionString);
        });

        services.AddScoped<IUserProfileStore, EfUserProfileStore>();
        services.AddScoped<ISavedLevelService, EfSavedLevelService>();
        services.AddScoped<IMultiplayerLobbyService, EfMultiplayerLobbyService>();
        return services;
    }
}
