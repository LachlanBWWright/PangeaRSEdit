using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Application.Multiplayer;
using PangeaRSEdit.Infrastructure.Persistence;
using PangeaRSEdit.Infrastructure.Persistence.Entities;
using System.Data;
using System.Text.Json;

namespace PangeaRSEdit.Infrastructure.Multiplayer;

public sealed class EfMultiplayerLobbyService(
    PangeaRSEditDbContext dbContext,
    MultiplayerRuntimeState runtimeState,
    IConfiguration configuration) : IMultiplayerLobbyService
{
    private static readonly TimeSpan ParticipantStaleAfter = TimeSpan.FromMinutes(2);
    private const int RequiredProtocolVersion = 1;
    private const string RequiredRuntimeVersion = "host-authoritative-v2";

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
            TagDurationMinutes = Math.Clamp(request.TagDurationMinutes, 2, 4),
            MaxPlayers = Math.Clamp(request.MaxPlayers, 2, 6),
            IsPublic = request.IsPublic,
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
        MultiplayerMetrics.LobbyCreated(lobby.GameId, lobby.Mode);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<IReadOnlyList<MultiplayerLobbySummary>>> ListLobbiesAsync(
        string? gameId,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var query = dbContext.MultiplayerLobbies
            .Include(x => x.Players)
            .Where(x => x.State == "open");

        if (!string.IsNullOrWhiteSpace(gameId))
        {
            query = query.Where(x => x.GameId == gameId);
        }

        var openLobbies = await query
            .ToListAsync(cancellationToken);

        var lobbies = openLobbies
            .Where(x => x.ExpiresAt > now)
            .OrderByDescending(x => x.CreatedAt)
            .ToList();

        var summaries = lobbies
            .Where(x => x.IsPublic)
            .Select(x =>
            {
                var canJoin =
                    x.State == "open"
                    && x.ExpiresAt > now
                    && x.Players.Count < x.MaxPlayers;
                return new MultiplayerLobbySummary(
                    x.Id,
                    x.GameId,
                    x.Mode,
                    x.TrackOrLevel,
                    x.TagDurationMinutes,
                    x.MaxPlayers,
                    true,
                    x.JoinCode,
                    x.State,
                    x.Players.Count,
                    canJoin,
                    x.CreatedAt,
                    x.ExpiresAt
                );
            })
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
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);
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
            await transaction.CommitAsync(cancellationToken);
            return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
        }

        if (lobby.Players.Count >= lobby.MaxPlayers)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyFull);
        }

        var occupiedIndexes = lobby.Players.Select(player => player.PlayerIndex).ToHashSet();
        var nextIndex = Enumerable.Range(0, lobby.MaxPlayers)
            .First(index => !occupiedIndexes.Contains(index));
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

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyFull);
        }
        MultiplayerMetrics.LobbyJoined(lobby.GameId, lobby.Mode);
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

        if (lobby.Players.Count < 2)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (!request.Force && lobby.Players.Any(x => !x.IsReady))
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
        MultiplayerMetrics.MatchStarted(lobby.GameId, lobby.Mode);

        var matchConfig = BuildMatchConfig(lobby, lobby.MatchId.Value, lobby.MatchSeed.Value);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby, matchConfig));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> UpdateSelectionAsync(
        UpdateLobbySelectionRequest request,
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

        if (lobby.ExpiresAt <= DateTimeOffset.UtcNow || lobby.State != "open")
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        lobby.Mode = request.Mode;
        lobby.TrackOrLevel = request.TrackOrLevel;
        lobby.TagDurationMinutes = Math.Clamp(request.TagDurationMinutes, 2, 4);
        foreach (var player in lobby.Players)
        {
            player.IsReady = false;
            if (player.ParticipantId == request.ParticipantId)
            {
                player.LastSeenAt = DateTimeOffset.UtcNow;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> EndMatchAsync(
        EndLobbyMatchRequest request,
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

        if (lobby.State != "started" && lobby.State != "connecting")
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        var now = DateTimeOffset.UtcNow;
        lobby.State = "match_ended";
        lobby.MatchEndedAt = now;
        lobby.LastReportType = "match-ended";
        lobby.LastReportDetail = request.Detail;
        lobby.LastReportByParticipantId = request.ParticipantId;
        lobby.LastReportAt = now;
        MultiplayerMetrics.ReportReceived(lobby.GameId, lobby.Mode, "match-ended");
        MultiplayerMetrics.MatchEnded(
            lobby.GameId,
            lobby.Mode,
            "match-ended",
            lobby.MatchStartedAt,
            now);
        runtimeState.ClearRuntimeReady(lobby.Id);

        var player = lobby.Players.SingleOrDefault(x => x.ParticipantId == request.ParticipantId);
        if (player is not null)
        {
            player.LastSeenAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> RematchLobbyAsync(
        RematchLobbyRequest request,
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

        if (lobby.State != "match_ended")
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (lobby.Players.Count < 2)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (!request.Force && lobby.Players.Any(x => !x.IsReady))
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        lobby.GameId = request.GameId;
        lobby.Mode = request.Mode;
        lobby.TrackOrLevel = request.TrackOrLevel;
        lobby.TagDurationMinutes = Math.Clamp(request.TagDurationMinutes, 2, 4);
        lobby.State = "connecting";
        runtimeState.ClearRuntimeReady(lobby.Id);
        lobby.MatchId = Guid.CreateVersion7();
        lobby.MatchSeed = Random.Shared.Next(1, int.MaxValue);
        lobby.MatchStartedAt = DateTimeOffset.UtcNow;
        lobby.MatchEndedAt = null;
        lobby.MatchResultJson = null;
        lobby.MatchResultByParticipantId = null;
        lobby.MatchResultAt = null;
        await dbContext.SaveChangesAsync(cancellationToken);

        lobby.State = "started";
        await dbContext.SaveChangesAsync(cancellationToken);
        MultiplayerMetrics.MatchStarted(lobby.GameId, lobby.Mode);

        var matchConfig = BuildMatchConfig(lobby, lobby.MatchId.Value, lobby.MatchSeed.Value);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby, matchConfig, null));
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
        MultiplayerMetrics.ReportReceived(lobby.GameId, lobby.Mode, request.EventType);

        var isAuthoritativeTerminalReport =
            request.ParticipantId == lobby.HostParticipantId
            && (request.EventType == "match-ended" || request.EventType == "host-disconnected");
        if (isAuthoritativeTerminalReport)
        {
            lobby.State = request.EventType == "match-ended" ? "match_ended" : "ended";
            lobby.MatchEndedAt ??= now;
            MultiplayerMetrics.MatchEnded(
                lobby.GameId,
                lobby.Mode,
                request.EventType,
                lobby.MatchStartedAt,
                now);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby));
    }

    public async Task<AppResult<MultiplayerLobbyDetails>> ReportMatchResultAsync(
        LobbyReportMatchResultRequest request,
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

        if (lobby.HostParticipantId != request.ParticipantId)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyForbidden);
        }

        if (lobby.MatchId is null || lobby.MatchSeed is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (request.Result.LobbyId != lobby.Id || request.Result.MatchId != lobby.MatchId.Value)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (request.Result.Seed != lobby.MatchSeed.Value)
        {
            MultiplayerMetrics.ResultRejected("seed-mismatch");
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (!string.Equals(request.Result.GameId, lobby.GameId, StringComparison.Ordinal)
            || !string.Equals(request.Result.Mode, lobby.Mode, StringComparison.Ordinal)
            || !string.Equals(request.Result.TrackOrLevel, lobby.TrackOrLevel, StringComparison.Ordinal))
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        if (request.Result.Players.Count != lobby.Players.Count)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        var lobbyPlayerByParticipant = lobby.Players.ToDictionary(
            lobbyPlayer => lobbyPlayer.ParticipantId,
            StringComparer.Ordinal);
        var resultParticipantIds = request.Result.Players
            .Select(resultPlayer => resultPlayer.ParticipantId)
            .ToList();
        if (resultParticipantIds.Distinct(StringComparer.Ordinal).Count() != resultParticipantIds.Count)
        {
            MultiplayerMetrics.ResultRejected("duplicate-participant");
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        var participantMismatch = request.Result.Players.Any(resultPlayer =>
            !lobbyPlayerByParticipant.TryGetValue(resultPlayer.ParticipantId, out var lobbyPlayer)
            || lobbyPlayer.PlayerIndex != resultPlayer.PlayerIndex);
        if (participantMismatch)
        {
            MultiplayerMetrics.ResultRejected("participant-mismatch");
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        var validPlayerIndexes = lobby.Players.Select(lobbyPlayer => lobbyPlayer.PlayerIndex).ToHashSet();
        if (request.Result.Placements.Count != lobby.Players.Count
            || request.Result.Placements.Distinct().Count() != request.Result.Placements.Count
            || request.Result.Placements.Any(playerIndex => !validPlayerIndexes.Contains(playerIndex))
            || !validPlayerIndexes.Contains(request.Result.WinnerPlayerIndex))
        {
            MultiplayerMetrics.ResultRejected("placement-mismatch");
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        var invalidPlayerResult = request.Result.Players.Any(resultPlayer =>
            resultPlayer.Placement < 0
            || resultPlayer.Placement >= lobby.Players.Count
            || resultPlayer.Score < 0
            || resultPlayer.Score > 1_000_000_000
            || resultPlayer.TimeMs < 0
            || resultPlayer.TimeMs > 86_400_000
            || resultPlayer.LapsCompleted < 0
            || resultPlayer.LapsCompleted > 100
            || resultPlayer.Checkpoint < 0
            || resultPlayer.Checkpoint > 10_000);
        var resultPlacements = request.Result.Players.Select(resultPlayer => resultPlayer.Placement).ToList();
        var validWinningTeams = request.Result.Players
            .Select(resultPlayer => resultPlayer.Team)
            .Append("none")
            .ToHashSet(StringComparer.Ordinal);
        if (invalidPlayerResult
            || resultPlacements.Distinct().Count() != resultPlacements.Count
            || !validWinningTeams.Contains(request.Result.WinningTeam))
        {
            MultiplayerMetrics.ResultRejected("invalid-player-result");
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        var now = DateTimeOffset.UtcNow;
        if (request.Result.EndedAt < lobby.MatchStartedAt
            || request.Result.EndedAt > now.AddMinutes(5))
        {
            MultiplayerMetrics.ResultRejected("invalid-ended-at");
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyInvalidState);
        }

        player.LastSeenAt = now;
        lobby.MatchResultJson = JsonSerializer.Serialize(request.Result);
        lobby.MatchResultByParticipantId = request.ParticipantId;
        lobby.MatchResultAt = now;
        lobby.MatchEndedAt ??= now;
        lobby.State = "match_ended";
        await dbContext.SaveChangesAsync(cancellationToken);
        MultiplayerMetrics.MatchEnded(
            lobby.GameId,
            lobby.Mode,
            request.Result.EndReason,
            lobby.MatchStartedAt,
            now);
        return AppResult<MultiplayerLobbyDetails>.Success(MapDetails(lobby, null, request.Result));
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
                var staleHost = stalePlayers.Any(player => player.ParticipantId == lobby.HostParticipantId);
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
                else if (staleHost && lobby.State == "started")
                {
                    lobby.State = "ended";
                    lobby.MatchEndedAt ??= now;
                    lobby.LastReportType = "host-timeout";
                    lobby.LastReportDetail = "The authoritative host did not reconnect before the stale-player deadline.";
                    lobby.LastReportByParticipantId = lobby.HostParticipantId;
                    lobby.LastReportAt = now;
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
        MultiplayerMatchConfig? matchConfig = null,
        MultiplayerMatchResult? matchResult = null)
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
            lobby.TagDurationMinutes,
            lobby.MaxPlayers,
            lobby.IsPublic,
            lobby.HostParticipantId,
            lobby.JoinCode,
            lobby.State,
            lobby.CreatedAt,
            lobby.ExpiresAt,
            players,
            matchConfig ?? TryBuildStoredMatchConfig(lobby),
            matchResult ?? TryBuildStoredMatchResult(lobby)
        );
    }

    private MultiplayerMatchConfig? TryBuildStoredMatchConfig(MultiplayerLobbyEntity lobby)
    {
        if (lobby.MatchId is null || lobby.MatchSeed is null)
        {
            return null;
        }

        return BuildMatchConfig(lobby, lobby.MatchId.Value, lobby.MatchSeed.Value);
    }

    private static MultiplayerMatchResult? TryBuildStoredMatchResult(MultiplayerLobbyEntity lobby)
    {
        if (string.IsNullOrWhiteSpace(lobby.MatchResultJson))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<MultiplayerMatchResult>(lobby.MatchResultJson);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private MultiplayerMatchConfig BuildMatchConfig(
        MultiplayerLobbyEntity lobby,
        Guid matchId,
        int seed)
    {
        var hostPlayerIndex = lobby.Players
            .SingleOrDefault(x => x.ParticipantId == lobby.HostParticipantId)
            ?.PlayerIndex ?? 0;
        var staleCutoff = DateTimeOffset.UtcNow - ParticipantStaleAfter;
        var orderedPlayers = lobby.Players
            .OrderBy(x => x.PlayerIndex)
            .Select(x => new MultiplayerMatchConfigPlayer(
                x.ParticipantId,
                x.PlayerIndex,
                x.DisplayName,
                x.LastSeenAt < staleCutoff ? "stale" : "connected"
            ))
            .Cast<MultiplayerMatchConfigPlayer>()
            .ToList();

        return new MultiplayerMatchConfig(
            lobby.Id,
            matchId,
            lobby.GameId,
            lobby.Mode,
            lobby.TrackOrLevel,
            seed,
            lobby.TagDurationMinutes,
            hostPlayerIndex,
            lobby.MaxPlayers,
            RequiredProtocolVersion,
            RequiredRuntimeVersion,
            configuration["Multiplayer:RequiredContentHash"] ?? "development-unpinned",
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
