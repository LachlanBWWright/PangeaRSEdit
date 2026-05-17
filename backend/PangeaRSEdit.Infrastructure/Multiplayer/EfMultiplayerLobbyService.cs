using Microsoft.EntityFrameworkCore;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Application.Multiplayer;
using PangeaRSEdit.Infrastructure.Persistence;
using PangeaRSEdit.Infrastructure.Persistence.Entities;

namespace PangeaRSEdit.Infrastructure.Multiplayer;

public sealed class EfMultiplayerLobbyService(
    PangeaRSEditDbContext dbContext,
    MultiplayerRuntimeState runtimeState) : IMultiplayerLobbyService
{
    private static readonly TimeSpan ParticipantStaleAfter = TimeSpan.FromMinutes(2);

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

        runtimeState.SetLobbyVisibility(lobby.Id, request.IsPublic);

        dbContext.MultiplayerLobbies.Add(lobby);
        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<IReadOnlyList<MultiplayerLobbySummary>>> ListLobbiesAsync(
        string gameId,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var openLobbies = await dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .Where(x => x.GameId == gameId && x.State == "open")
            .ToListAsync(cancellationToken);

        var lobbies = openLobbies
            .Where(x => x.ExpiresAt > now)
            .OrderByDescending(x => x.CreatedAt)
            .ToList();

        var summaries = lobbies
            .Where(x => runtimeState.IsLobbyPublic(x.Id))
            .Select(x => new MultiplayerLobbySummary(
                x.Id,
                x.GameId,
                x.Mode,
                x.TrackOrLevel,
                x.MaxPlayers,
                true,
                x.JoinCode,
                x.State,
                x.Players.Count,
                x.CreatedAt,
                x.ExpiresAt
            ))
            .Cast<MultiplayerLobbySummary>()
            .ToList();

        return AppResult<IReadOnlyList<MultiplayerLobbySummary>>.Success(summaries);
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

        if (lobby.ExpiresAt <= DateTimeOffset.UtcNow)
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
        runtimeState.RemoveParticipant(player.ParticipantId);

        var remainingPlayers = lobby.Players.Where(x => x.ParticipantId != request.ParticipantId).ToList();
        if (remainingPlayers.Count == 0)
        {
            lobby.State = "closed";
            runtimeState.RemoveLobby(lobby.Id);
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

        if (lobby.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (lobby.State == "started")
        {
            return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
        }

        if (lobby.State != "open")
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (lobby.Players.Count < 2 || lobby.Players.Any(x => !x.IsReady))
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        lobby.State = "connecting";
        runtimeState.ClearRuntimeReady(lobby.Id);
        lobby.MatchId ??= Guid.CreateVersion7();
        lobby.MatchSeed ??= BuildMatchSeed(lobby);
        lobby.MatchStartedAt ??= DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        lobby.State = "started";
        await dbContext.SaveChangesAsync(cancellationToken);

        var matchConfig = BuildMatchConfig(lobby, lobby.MatchId.Value, lobby.MatchSeed.Value);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby, matchConfig));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> RemoveParticipantAsync(
        RemoveLobbyParticipantRequest request,
        CancellationToken cancellationToken)
    {
        var lobby = await dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .SingleOrDefaultAsync(x => x.Id == request.LobbyId, cancellationToken);
        if (lobby is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyNotFound);
        }

        if (lobby.HostParticipantId != request.RequestingParticipantId)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyForbidden);
        }

        if (request.RequestingParticipantId == request.TargetParticipantId)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        var player = lobby.Players.SingleOrDefault(x => x.ParticipantId == request.TargetParticipantId);
        if (player is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyNotFound);
        }

        dbContext.MultiplayerLobbyPlayers.Remove(player);
        runtimeState.RemoveParticipant(player.ParticipantId);

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> HeartbeatAsync(
        LobbyHeartbeatRequest request,
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

        var now = DateTimeOffset.UtcNow;
        player.LastSeenAt = now;
        if (lobby.ExpiresAt < now.AddMinutes(30))
        {
            lobby.ExpiresAt = now.AddHours(4);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> ReportEventAsync(
        LobbyReportEventRequest request,
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

        var now = DateTimeOffset.UtcNow;
        player.LastSeenAt = now;
        lobby.LastReportType = request.EventType;
        lobby.LastReportDetail = request.Detail;
        lobby.LastReportByParticipantId = request.ParticipantId;
        lobby.LastReportAt = now;

        if (
            request.EventType == "match-ended" ||
            request.EventType == "participant-disconnected" ||
            request.EventType == "host-disconnected" ||
            request.EventType == "desync-reported" ||
            request.EventType == "timeout-reported"
        )
        {
            lobby.State = "ended";
            lobby.MatchEndedAt ??= now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task CleanupExpiredAndStaleAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var staleBefore = now - ParticipantStaleAfter;
        var lobbies = await dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .Where(x => x.State == "open" || x.State == "connecting" || x.State == "started")
            .ToListAsync(cancellationToken);

        foreach (var lobby in lobbies)
        {
            var stalePlayers = lobby.Players
                .Where(player => player.LastSeenAt < staleBefore)
                .ToList();

            if (stalePlayers.Count > 0)
            {
                foreach (var stalePlayer in stalePlayers)
                {
                    dbContext.MultiplayerLobbyPlayers.Remove(stalePlayer);
                    runtimeState.RemoveParticipant(stalePlayer.ParticipantId);
                }

                var remainingPlayers = lobby.Players
                    .Where(player => !stalePlayers.Contains(player))
                    .OrderBy(player => player.PlayerIndex)
                    .ToList();

                if (remainingPlayers.Count == 0)
                {
                    lobby.State = "expired";
                    runtimeState.RemoveLobby(lobby.Id);
                }
                else
                {
                    var host = remainingPlayers.FirstOrDefault(player => player.IsHost);
                    if (host is null)
                    {
                        var nextHost = remainingPlayers[0];
                        nextHost.IsHost = true;
                        lobby.HostParticipantId = nextHost.ParticipantId;
                    }
                    else
                    {
                        lobby.HostParticipantId = host.ParticipantId;
                    }
                }
            }

            if (lobby.ExpiresAt <= now && (lobby.State == "open" || lobby.State == "connecting"))
            {
                lobby.State = "expired";
                runtimeState.RemoveLobby(lobby.Id);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private MultiplayerLobbyDetails MapDetails(
        MultiplayerLobbyEntity lobby,
        MultiplayerMatchConfig? matchConfig = null)
    {
        var players = lobby.Players
            .OrderBy(x => x.PlayerIndex)
            .Select(x =>
            {
                var telemetry = runtimeState.GetParticipantTelemetry(x.ParticipantId);
                return new MultiplayerLobbyPlayer(
                    x.ParticipantId,
                    x.DisplayName,
                    x.PlayerIndex,
                    x.IsHost,
                    x.IsReady,
                    telemetry.Region,
                    telemetry.PingMs,
                    x.JoinedAt,
                    x.LastSeenAt
                );
            })
            .Cast<MultiplayerLobbyPlayer>()
            .ToList();

        return new MultiplayerLobbyDetails(
            lobby.Id,
            lobby.GameId,
            lobby.Mode,
            lobby.TrackOrLevel,
            lobby.MaxPlayers,
            runtimeState.IsLobbyPublic(lobby.Id),
            lobby.HostParticipantId,
            lobby.JoinCode,
            lobby.State,
            lobby.CreatedAt,
            lobby.ExpiresAt,
            players,
            matchConfig ?? TryBuildStoredMatchConfig(lobby)
        );
    }

    private static MultiplayerMatchConfig? TryBuildStoredMatchConfig(MultiplayerLobbyEntity lobby)
    {
        if (lobby.MatchId is null || lobby.MatchSeed is null)
        {
            return null;
        }

        return BuildMatchConfig(lobby, lobby.MatchId.Value, lobby.MatchSeed.Value);
    }

    private static MultiplayerMatchConfig BuildMatchConfig(
        MultiplayerLobbyEntity lobby,
        Guid matchId,
        int seed)
    {
        var orderedPlayers = lobby.Players
            .OrderBy(x => x.PlayerIndex)
            .Select(x => new MultiplayerMatchConfigPlayer(
                x.ParticipantId,
                x.PlayerIndex,
                x.DisplayName
            ))
            .Cast<MultiplayerMatchConfigPlayer>()
            .ToList();

        return new MultiplayerMatchConfig(
            matchId,
            lobby.GameId,
            lobby.Mode,
            lobby.TrackOrLevel,
            seed,
            lobby.HostParticipantId,
            orderedPlayers
        );
    }

    private static int BuildMatchSeed(MultiplayerLobbyEntity lobby)
    {
        var seed = Math.Abs(HashCode.Combine(lobby.Id, lobby.CreatedAt));
        return seed == 0 ? 1 : seed;
    }

    private static string BuildJoinCode()
    {
        return Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
    }
}
