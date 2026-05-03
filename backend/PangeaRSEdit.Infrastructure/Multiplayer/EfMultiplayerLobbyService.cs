using Microsoft.EntityFrameworkCore;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Application.Multiplayer;
using PangeaRSEdit.Infrastructure.Persistence;
using PangeaRSEdit.Infrastructure.Persistence.Entities;

namespace PangeaRSEdit.Infrastructure.Multiplayer;

public sealed class EfMultiplayerLobbyService(PangeaRSEditDbContext dbContext) : IMultiplayerLobbyService
{
    public async Task<AppResult<MultiplayerLobbyDetails>> CreateLobbyAsync(
        CreateLobbyRequest request,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var lobby = new MultiplayerLobbyEntity
        {
            Id = Guid.CreateVersion7(),
            GameId = request.GameId,
            Mode = request.Mode,
            TrackOrLevel = request.TrackOrLevel,
            MaxPlayers = Math.Clamp(request.MaxPlayers, 2, 6),
            HostParticipantId = request.ParticipantId,
            JoinCode = BuildJoinCode(),
            State = "open",
            CreatedAt = now,
            ExpiresAt = now.AddHours(4)
        };

        lobby.Players.Add(new MultiplayerLobbyPlayerEntity
        {
            Id = Guid.CreateVersion7(),
            LobbyId = lobby.Id,
            ParticipantId = request.ParticipantId,
            DisplayName = request.DisplayName,
            PlayerIndex = 0,
            IsHost = true,
            IsReady = false,
            JoinedAt = now,
            LastSeenAt = now
        });

        dbContext.MultiplayerLobbies.Add(lobby);
        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<IReadOnlyList<MultiplayerLobbySummary>>> ListLobbiesAsync(
        string gameId,
        CancellationToken cancellationToken)
    {
        var lobbies = await dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .Where(x => x.GameId == gameId && x.State == "open" && x.ExpiresAt > DateTimeOffset.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new MultiplayerLobbySummary(
                x.Id,
                x.GameId,
                x.Mode,
                x.TrackOrLevel,
                x.MaxPlayers,
                x.JoinCode,
                x.State,
                x.Players.Count,
                x.CreatedAt,
                x.ExpiresAt
            ))
            .Cast<MultiplayerLobbySummary>()
            .ToListAsync(cancellationToken);

        return AppResult<IReadOnlyList<MultiplayerLobbySummary>>.Success(lobbies);
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> GetLobbyAsync(
        Guid lobbyId,
        CancellationToken cancellationToken)
    {
        var lobby = await dbContext.MultiplayerLobbies
            .Include(x => x.Players.OrderBy(p => p.PlayerIndex))
            .SingleOrDefaultAsync(x => x.Id == lobbyId, cancellationToken);

        if (lobby is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyNotFound);
        }

        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> JoinLobbyAsync(
        JoinLobbyRequest request,
        CancellationToken cancellationToken)
    {
        var lobby = await dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .SingleOrDefaultAsync(x => x.Id == request.LobbyId, cancellationToken);
        if (lobby is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyNotFound);
        }

        if (lobby.State != "open")
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        var existing = lobby.Players.SingleOrDefault(x => x.ParticipantId == request.ParticipantId);
        if (existing is not null)
        {
            existing.DisplayName = request.DisplayName;
            existing.LastSeenAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
        }

        if (lobby.Players.Count >= lobby.MaxPlayers)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyFull);
        }

        var nextIndex = lobby.Players.Count;
        var now = DateTimeOffset.UtcNow;
        lobby.Players.Add(new MultiplayerLobbyPlayerEntity
        {
            Id = Guid.CreateVersion7(),
            LobbyId = lobby.Id,
            ParticipantId = request.ParticipantId,
            DisplayName = request.DisplayName,
            PlayerIndex = nextIndex,
            IsHost = false,
            IsReady = false,
            JoinedAt = now,
            LastSeenAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<bool>> LeaveLobbyAsync(
        LeaveLobbyRequest request,
        CancellationToken cancellationToken)
    {
        var lobby = await dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .SingleOrDefaultAsync(x => x.Id == request.LobbyId, cancellationToken);
        if (lobby is null)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyNotFound);
        }

        var player = lobby.Players.SingleOrDefault(x => x.ParticipantId == request.ParticipantId);
        if (player is null)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyForbidden);
        }

        dbContext.MultiplayerLobbyPlayers.Remove(player);
        var remainingPlayers = lobby.Players.Where(x => x.ParticipantId != request.ParticipantId).ToList();
        if (remainingPlayers.Count == 0)
        {
            lobby.State = "closed";
        }
        else if (player.IsHost)
        {
            var nextHost = remainingPlayers.OrderBy(x => x.PlayerIndex).First();
            nextHost.IsHost = true;
            lobby.HostParticipantId = nextHost.ParticipantId;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<bool>.Success(true);
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> SetReadyAsync(
        SetLobbyReadyRequest request,
        CancellationToken cancellationToken)
    {
        var lobby = await dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .SingleOrDefaultAsync(x => x.Id == request.LobbyId, cancellationToken);
        if (lobby is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyNotFound);
        }

        var player = lobby.Players.SingleOrDefault(x => x.ParticipantId == request.ParticipantId);
        if (player is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyForbidden);
        }

        player.IsReady = request.IsReady;
        player.LastSeenAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> StartLobbyAsync(
        StartLobbyRequest request,
        CancellationToken cancellationToken)
    {
        var lobby = await dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .SingleOrDefaultAsync(x => x.Id == request.LobbyId, cancellationToken);
        if (lobby is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyNotFound);
        }

        if (lobby.HostParticipantId != request.ParticipantId)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyForbidden);
        }

        if (lobby.State != "open")
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (lobby.Players.Count < 2 || lobby.Players.Any(x => !x.IsReady))
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        lobby.State = "started";
        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    private static MultiplayerLobbyDetails MapDetails(MultiplayerLobbyEntity lobby)
    {
        var players = lobby.Players
            .OrderBy(x => x.PlayerIndex)
            .Select(x => new MultiplayerLobbyPlayer(
                x.ParticipantId,
                x.DisplayName,
                x.PlayerIndex,
                x.IsHost,
                x.IsReady,
                x.JoinedAt,
                x.LastSeenAt
            ))
            .Cast<MultiplayerLobbyPlayer>()
            .ToList();

        return new MultiplayerLobbyDetails(
            lobby.Id,
            lobby.GameId,
            lobby.Mode,
            lobby.TrackOrLevel,
            lobby.MaxPlayers,
            lobby.HostParticipantId,
            lobby.JoinCode,
            lobby.State,
            lobby.CreatedAt,
            lobby.ExpiresAt,
            players
        );
    }

    private static string BuildJoinCode()
    {
        return Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
    }
}
