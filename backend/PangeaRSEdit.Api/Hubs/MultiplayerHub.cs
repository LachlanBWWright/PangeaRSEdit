using System.Collections.Concurrent;
using System.Net;
using Microsoft.AspNetCore.SignalR;
using PangeaRSEdit.Application.Common;
using PangeaRSEdit.Application.Multiplayer;
using PangeaRSEdit.Infrastructure.Multiplayer;

namespace PangeaRSEdit.Api.Hubs;

/// <summary>
/// SignalR hub for WebRTC signaling between lobby participants.
/// Participants must be in the same lobby to exchange signaling messages.
/// The hub validates participant membership before relaying any message.
/// </summary>
public sealed class MultiplayerHub : Hub
{
    private static readonly ConcurrentDictionary<string, string> ParticipantConnectionIds = new();
    private readonly IMultiplayerLobbyService _lobbyService;
    private readonly MultiplayerRuntimeState _runtimeState;

    public MultiplayerHub(IMultiplayerLobbyService lobbyService, MultiplayerRuntimeState runtimeState)
    {
        _lobbyService = lobbyService;
        _runtimeState = runtimeState;
    }

    /// <summary>
    /// Join the SignalR group for a lobby so subsequent signaling messages
    /// are visible to all participants in that lobby.
    /// </summary>
    public async Task<AppResult<bool>> JoinLobby(Guid lobbyId, string participantId)
    {
        var result = await _lobbyService.GetLobbyAsync(lobbyId, CancellationToken.None);
        if (!result.IsSuccess)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyNotFound);
        }

        var lobby = result.Value!;
        var isMember = lobby.Players.Any(p => p.ParticipantId == participantId);
        if (!isMember)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyForbidden);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, LobbyGroupName(lobbyId));

        // Store participant context for authorization in subsequent calls
        Context.Items["lobbyId"] = lobbyId;
        Context.Items["participantId"] = participantId;
        ParticipantConnectionIds[participantId] = Context.ConnectionId;
        _runtimeState.SetParticipantRegion(participantId, ResolveRegion(Context.GetHttpContext()?.Connection.RemoteIpAddress));

        // Notify other participants that this peer has connected
        await Clients.OthersInGroup(LobbyGroupName(lobbyId))
            .SendAsync("PeerJoined", participantId);

        return AppResult<bool>.Success(true);
    }

    /// <summary>
    /// Leave the lobby group and notify remaining participants.
    /// </summary>
    public async Task<AppResult<bool>> LeaveLobby(Guid lobbyId)
    {
        var participantId = GetCallerParticipantId();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, LobbyGroupName(lobbyId));

        if (participantId is not null)
        {
            ParticipantConnectionIds.TryRemove(participantId, out _);
            await Clients.OthersInGroup(LobbyGroupName(lobbyId))
                .SendAsync("PeerLeft", participantId);
        }

        Context.Items.Remove("lobbyId");
        Context.Items.Remove("participantId");
        return AppResult<bool>.Success(true);
    }

    /// <summary>
    /// Relay a WebRTC offer SDP to a specific peer in the same lobby.
    /// </summary>
    public async Task<AppResult<bool>> SendOffer(Guid lobbyId, string targetParticipantId, string sdp)
    {
        var lobbyResult = await GetAuthorizedLobbyAsync(lobbyId);
        if (!lobbyResult.IsSuccess || lobbyResult.Value is null)
        {
            return AppResult<bool>.Failure(lobbyResult.ErrorCode ?? AppErrors.LobbyNotFound);
        }

        var sdpResult = ValidateSdpSize(sdp);
        if (!sdpResult.IsSuccess)
        {
            return sdpResult;
        }

        var lobby = lobbyResult.Value;
        var fromId = GetCallerParticipantId()!;
        var signalingResult = ValidateSignalingAllowed(lobby);
        if (!signalingResult.IsSuccess)
        {
            return signalingResult;
        }

        var targetResult = ValidateTargetParticipant(lobby, targetParticipantId);
        if (!targetResult.IsSuccess)
        {
            return targetResult;
        }

        var connectionResult = GetTargetConnectionId(targetParticipantId);
        if (!connectionResult.IsSuccess || connectionResult.Value is null)
        {
            return AppResult<bool>.Failure(connectionResult.ErrorCode ?? AppErrors.LobbyForbidden);
        }

        await Clients.Client(connectionResult.Value)
            .SendAsync("ReceiveOffer", fromId, targetParticipantId, sdp);
        return AppResult<bool>.Success(true);
    }

    /// <summary>
    /// Relay a WebRTC answer SDP to a specific peer in the same lobby.
    /// </summary>
    public async Task<AppResult<bool>> SendAnswer(Guid lobbyId, string targetParticipantId, string sdp)
    {
        var lobbyResult = await GetAuthorizedLobbyAsync(lobbyId);
        if (!lobbyResult.IsSuccess || lobbyResult.Value is null)
        {
            return AppResult<bool>.Failure(lobbyResult.ErrorCode ?? AppErrors.LobbyNotFound);
        }

        var sdpResult = ValidateSdpSize(sdp);
        if (!sdpResult.IsSuccess)
        {
            return sdpResult;
        }

        var lobby = lobbyResult.Value;
        var fromId = GetCallerParticipantId()!;
        var signalingResult = ValidateSignalingAllowed(lobby);
        if (!signalingResult.IsSuccess)
        {
            return signalingResult;
        }

        var targetResult = ValidateTargetParticipant(lobby, targetParticipantId);
        if (!targetResult.IsSuccess)
        {
            return targetResult;
        }

        var connectionResult = GetTargetConnectionId(targetParticipantId);
        if (!connectionResult.IsSuccess || connectionResult.Value is null)
        {
            return AppResult<bool>.Failure(connectionResult.ErrorCode ?? AppErrors.LobbyForbidden);
        }

        await Clients.Client(connectionResult.Value)
            .SendAsync("ReceiveAnswer", fromId, targetParticipantId, sdp);
        return AppResult<bool>.Success(true);
    }

    /// <summary>
    /// Relay a WebRTC ICE candidate to a specific peer in the same lobby.
    /// </summary>
    public async Task<AppResult<bool>> SendIceCandidate(Guid lobbyId, string targetParticipantId, string candidate)
    {
        var lobbyResult = await GetAuthorizedLobbyAsync(lobbyId);
        if (!lobbyResult.IsSuccess || lobbyResult.Value is null)
        {
            return AppResult<bool>.Failure(lobbyResult.ErrorCode ?? AppErrors.LobbyNotFound);
        }

        if (candidate.Length > 4096)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyInvalidState);
        }

        var lobby = lobbyResult.Value;
        var fromId = GetCallerParticipantId()!;
        var signalingResult = ValidateSignalingAllowed(lobby);
        if (!signalingResult.IsSuccess)
        {
            return signalingResult;
        }

        var targetResult = ValidateTargetParticipant(lobby, targetParticipantId);
        if (!targetResult.IsSuccess)
        {
            return targetResult;
        }

        var connectionResult = GetTargetConnectionId(targetParticipantId);
        if (!connectionResult.IsSuccess || connectionResult.Value is null)
        {
            return AppResult<bool>.Failure(connectionResult.ErrorCode ?? AppErrors.LobbyForbidden);
        }

        await Clients.Client(connectionResult.Value)
            .SendAsync("ReceiveIceCandidate", fromId, targetParticipantId, candidate);
        return AppResult<bool>.Success(true);
    }

    /// <summary>
    /// Update the caller's ready state and broadcast the change to the lobby group.
    /// </summary>
    public async Task<AppResult<bool>> SetReady(Guid lobbyId, bool isReady)
    {
        var membershipResult = ValidateLobbyMembership(lobbyId);
        if (!membershipResult.IsSuccess)
        {
            return membershipResult;
        }

        var participantId = GetCallerParticipantId()!;

        var result = await _lobbyService.SetReadyAsync(
            new SetLobbyReadyRequest(lobbyId, participantId, isReady),
            CancellationToken.None);

        if (!result.IsSuccess)
        {
            return AppResult<bool>.Failure(result.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("PlayerReadyChanged", participantId, isReady, result.Value);
        return AppResult<bool>.Success(true);
    }

    /// <summary>
    /// Start the lobby and notify participants with a server-issued match config.
    /// Only the lobby host may call this.
    /// </summary>
    public async Task<AppResult<bool>> NotifyMatchStarting(Guid lobbyId)
    {
        var membershipResult = ValidateLobbyMembership(lobbyId);
        if (!membershipResult.IsSuccess)
        {
            return membershipResult;
        }

        var participantId = GetCallerParticipantId()!;

        var startResult = await _lobbyService.StartLobbyAsync(
            new StartLobbyRequest(lobbyId, participantId),
            CancellationToken.None);
        if (!startResult.IsSuccess)
        {
            return AppResult<bool>.Failure(startResult.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        if (startResult.Value?.MatchConfig is null)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyInvalidState);
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("MatchStarting", lobbyId, startResult.Value.MatchConfig);
        return AppResult<bool>.Success(true);
    }

    public async Task<AppResult<bool>> RemoveParticipant(Guid lobbyId, string targetParticipantId)
    {
        var membershipResult = ValidateLobbyMembership(lobbyId);
        if (!membershipResult.IsSuccess)
        {
            return membershipResult;
        }

        var participantId = GetCallerParticipantId()!;

        var removeResult = await _lobbyService.RemoveParticipantAsync(
            new RemoveLobbyParticipantRequest(lobbyId, participantId, targetParticipantId),
            CancellationToken.None);
        if (!removeResult.IsSuccess || removeResult.Value is null)
        {
            return AppResult<bool>.Failure(removeResult.ErrorCode ?? AppErrors.LobbyInvalidState);
        }

        _runtimeState.RemoveParticipant(targetParticipantId);

        if (ParticipantConnectionIds.TryGetValue(targetParticipantId, out var targetConnectionId))
        {
            await Groups.RemoveFromGroupAsync(targetConnectionId, LobbyGroupName(lobbyId));
            await Clients.Client(targetConnectionId).SendAsync("RemovedFromLobby", lobbyId, targetParticipantId);
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("LobbyParticipantsChanged", removeResult.Value);
        return AppResult<bool>.Success(true);
    }

    public async Task<AppResult<bool>> SendLobbyChat(Guid lobbyId, string message)
    {
        var lobbyResult = await GetAuthorizedLobbyAsync(lobbyId);
        if (!lobbyResult.IsSuccess || lobbyResult.Value is null)
        {
            return AppResult<bool>.Failure(lobbyResult.ErrorCode ?? AppErrors.LobbyNotFound);
        }

        if (string.IsNullOrWhiteSpace(message))
        {
            return AppResult<bool>.Failure(AppErrors.LobbyInvalidState);
        }

        var trimmedMessage = message.Trim();
        if (trimmedMessage.Length > 400)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyInvalidState);
        }

        var lobby = lobbyResult.Value;
        var participantId = GetCallerParticipantId()!;
        var sender = lobby.Players.SingleOrDefault(x => x.ParticipantId == participantId);
        if (sender is null)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyForbidden);
        }

        await Clients.Group(LobbyGroupName(lobbyId)).SendAsync(
            "LobbyChatMessage",
            lobbyId,
            participantId,
            sender.DisplayName,
            trimmedMessage,
            DateTimeOffset.UtcNow);
        return AppResult<bool>.Success(true);
    }

    public Task<AppResult<bool>> ReportPing(Guid lobbyId, int pingMs)
    {
        var membershipResult = ValidateLobbyMembership(lobbyId);
        if (!membershipResult.IsSuccess)
        {
            return Task.FromResult(membershipResult);
        }

        var participantId = GetCallerParticipantId()!;
        _runtimeState.SetParticipantPing(participantId, pingMs);
        return Task.FromResult(AppResult<bool>.Success(true));
    }

    public async Task<AppResult<bool>> ReportRuntimeLevelReady(Guid lobbyId)
    {
        var lobbyResult = await GetAuthorizedLobbyAsync(lobbyId);
        if (!lobbyResult.IsSuccess)
        {
            return AppResult<bool>.Failure(lobbyResult.ErrorCode ?? AppErrors.LobbyNotFound);
        }

        var participantId = GetCallerParticipantId()!;
        _runtimeState.MarkRuntimeLevelReady(lobbyId, participantId);
        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("RuntimeLevelReady", lobbyId, participantId);
        return AppResult<bool>.Success(true);
    }

    public async Task<AppResult<bool>> NotifyRuntimeStartNow(Guid lobbyId)
    {
        var lobbyResult = await GetAuthorizedLobbyAsync(lobbyId);
        if (!lobbyResult.IsSuccess || lobbyResult.Value is null)
        {
            return AppResult<bool>.Failure(lobbyResult.ErrorCode ?? AppErrors.LobbyNotFound);
        }

        var lobby = lobbyResult.Value;
        var participantId = GetCallerParticipantId()!;
        if (lobby.HostParticipantId != participantId)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyForbidden);
        }

        var allReady = lobby.Players.All(player => _runtimeState.IsRuntimeLevelReady(lobbyId, player.ParticipantId));
        if (!allReady)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyInvalidState);
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("RuntimeStartNow", lobbyId);
        _runtimeState.ClearRuntimeReady(lobbyId);
        return AppResult<bool>.Success(true);
    }

    public Task<long> Ping(long clientTimeMs)
    {
        _ = clientTimeMs;
        return Task.FromResult(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var lobbyId = Context.Items.TryGetValue("lobbyId", out var lid) ? lid as Guid? : null;
        var participantId = GetCallerParticipantId();

        if (lobbyId.HasValue && participantId is not null)
        {
            var lobbyResult = await _lobbyService.GetLobbyAsync(lobbyId.Value, CancellationToken.None);
            var disconnectedPlayer = lobbyResult.IsSuccess && lobbyResult.Value is not null
                ? lobbyResult.Value.Players.SingleOrDefault(player => player.ParticipantId == participantId)
                : null;
            var disconnectedWasHost = disconnectedPlayer?.IsHost == true;

            ParticipantConnectionIds.TryRemove(participantId, out _);
            _runtimeState.RemoveParticipant(participantId);
            await _lobbyService.LeaveLobbyAsync(
                new LeaveLobbyRequest(lobbyId.Value, participantId),
                CancellationToken.None);

            await Clients.OthersInGroup(LobbyGroupName(lobbyId.Value))
                .SendAsync("PeerDisconnected", participantId);
            if (disconnectedWasHost)
            {
                await Clients.OthersInGroup(LobbyGroupName(lobbyId.Value))
                    .SendAsync("HostDisconnected", participantId);
            }
            else
            {
                await Clients.OthersInGroup(LobbyGroupName(lobbyId.Value))
                    .SendAsync("ParticipantDisconnected", participantId);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static string LobbyGroupName(Guid lobbyId) => $"lobby:{lobbyId}";

    private string? GetCallerParticipantId() =>
        Context.Items.TryGetValue("participantId", out var p) ? p as string : null;

    private AppResult<bool> ValidateLobbyMembership(Guid lobbyId)
    {
        if (!Context.Items.TryGetValue("lobbyId", out var stored) ||
            stored is not Guid storedId ||
            storedId != lobbyId)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyForbidden);
        }

        return AppResult<bool>.Success(true);
    }

    private static AppResult<bool> ValidateSdpSize(string sdp)
    {
        // SDP descriptions are typically a few KB; cap at 64 KB to prevent abuse
        if (sdp.Length > 65536)
        {
            return AppResult<bool>.Failure(AppErrors.LobbyInvalidState);
        }

        return AppResult<bool>.Success(true);
    }

    private async Task<AppResult<MultiplayerLobbyDetails>> GetAuthorizedLobbyAsync(Guid lobbyId)
    {
        var membershipResult = ValidateLobbyMembership(lobbyId);
        if (!membershipResult.IsSuccess)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(membershipResult.ErrorCode ?? AppErrors.LobbyForbidden);
        }

        var participantId = GetCallerParticipantId();
        if (participantId is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyForbidden);
        }

        var result = await _lobbyService.GetLobbyAsync(lobbyId, CancellationToken.None);
        if (!result.IsSuccess || result.Value is null)
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyNotFound);
        }

        if (result.Value.Players.All(p => p.ParticipantId != participantId))
        {
            return AppResult<MultiplayerLobbyDetails>.Failure(AppErrors.LobbyForbidden);
        }

        return AppResult<MultiplayerLobbyDetails>.Success(result.Value);
    }

    private static AppResult<bool> ValidateTargetParticipant(MultiplayerLobbyDetails lobby, string targetParticipantId)
    {
        if (lobby.Players.All(p => p.ParticipantId != targetParticipantId))
        {
            return AppResult<bool>.Failure(AppErrors.LobbyForbidden);
        }

        return AppResult<bool>.Success(true);
    }

    private static AppResult<bool> ValidateSignalingAllowed(MultiplayerLobbyDetails lobby)
    {
        if (lobby.State == "started")
        {
            return AppResult<bool>.Failure(AppErrors.LobbyInvalidState);
        }

        return AppResult<bool>.Success(true);
    }

    private static AppResult<string> GetTargetConnectionId(string targetParticipantId)
    {
        if (!ParticipantConnectionIds.TryGetValue(targetParticipantId, out var connectionId))
        {
            return AppResult<string>.Failure(AppErrors.LobbyInvalidState);
        }

        return AppResult<string>.Success(connectionId);
    }

    private static string ResolveRegion(IPAddress? ipAddress)
    {
        if (ipAddress is null)
        {
            return "unknown";
        }

        if (IPAddress.IsLoopback(ipAddress))
        {
            return "local";
        }

        if (ipAddress.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var bytes = ipAddress.GetAddressBytes();
            if (bytes[0] == 10 || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) || (bytes[0] == 192 && bytes[1] == 168))
            {
                return "private";
            }
        }

        return "public";
    }
}
