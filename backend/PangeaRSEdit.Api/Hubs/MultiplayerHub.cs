using System.Collections.Concurrent;
using System.Net;
using Microsoft.AspNetCore.SignalR;
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
    public async Task JoinLobby(Guid lobbyId, string participantId)
    {
        var result = await _lobbyService.GetLobbyAsync(lobbyId, CancellationToken.None);
        if (!result.IsSuccess)
        {
            throw new HubException($"Lobby not found: {lobbyId}");
        }

        var lobby = result.Value!;
        var isMember = lobby.Players.Any(p => p.ParticipantId == participantId);
        if (!isMember)
        {
            throw new HubException("Participant is not a member of this lobby.");
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
    }

    /// <summary>
    /// Leave the lobby group and notify remaining participants.
    /// </summary>
    public async Task LeaveLobby(Guid lobbyId)
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
    }

    /// <summary>
    /// Relay a WebRTC offer SDP to a specific peer in the same lobby.
    /// </summary>
    public async Task SendOffer(Guid lobbyId, string targetParticipantId, string sdp)
    {
        var lobby = await GetAuthorizedLobbyAsync(lobbyId);
        ValidateSdpSize(sdp);
        var fromId = GetCallerParticipantId()!;
        ValidateSignalingAllowed(lobby);
        ValidateTargetParticipant(lobby, targetParticipantId);
        var targetConnectionId = GetTargetConnectionId(targetParticipantId);

        await Clients.Client(targetConnectionId)
            .SendAsync("ReceiveOffer", fromId, targetParticipantId, sdp);
    }

    /// <summary>
    /// Relay a WebRTC answer SDP to a specific peer in the same lobby.
    /// </summary>
    public async Task SendAnswer(Guid lobbyId, string targetParticipantId, string sdp)
    {
        var lobby = await GetAuthorizedLobbyAsync(lobbyId);
        ValidateSdpSize(sdp);
        var fromId = GetCallerParticipantId()!;
        ValidateSignalingAllowed(lobby);
        ValidateTargetParticipant(lobby, targetParticipantId);
        var targetConnectionId = GetTargetConnectionId(targetParticipantId);

        await Clients.Client(targetConnectionId)
            .SendAsync("ReceiveAnswer", fromId, targetParticipantId, sdp);
    }

    /// <summary>
    /// Relay a WebRTC ICE candidate to a specific peer in the same lobby.
    /// </summary>
    public async Task SendIceCandidate(Guid lobbyId, string targetParticipantId, string candidate)
    {
        var lobby = await GetAuthorizedLobbyAsync(lobbyId);
        if (candidate.Length > 4096)
        {
            throw new HubException("ICE candidate payload too large.");
        }

        var fromId = GetCallerParticipantId()!;
        ValidateSignalingAllowed(lobby);
        ValidateTargetParticipant(lobby, targetParticipantId);
        var targetConnectionId = GetTargetConnectionId(targetParticipantId);

        await Clients.Client(targetConnectionId)
            .SendAsync("ReceiveIceCandidate", fromId, targetParticipantId, candidate);
    }

    /// <summary>
    /// Update the caller's ready state and broadcast the change to the lobby group.
    /// </summary>
    public async Task SetReady(Guid lobbyId, bool isReady)
    {
        ValidateLobbyMembership(lobbyId);
        var participantId = GetCallerParticipantId()!;

        var result = await _lobbyService.SetReadyAsync(
            new SetLobbyReadyRequest(lobbyId, participantId, isReady),
            CancellationToken.None);

        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorCode ?? "Failed to update ready state.");
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("PlayerReadyChanged", participantId, isReady, result.Value);
    }

    /// <summary>
    /// Start the lobby and notify participants with a server-issued match config.
    /// Only the lobby host may call this.
    /// </summary>
    public async Task NotifyMatchStarting(Guid lobbyId)
    {
        ValidateLobbyMembership(lobbyId);
        var participantId = GetCallerParticipantId()!;

        var startResult = await _lobbyService.StartLobbyAsync(
            new StartLobbyRequest(lobbyId, participantId),
            CancellationToken.None);
        if (!startResult.IsSuccess)
        {
            throw new HubException(startResult.ErrorCode ?? "Failed to start lobby.");
        }

        if (startResult.Value?.MatchConfig is null)
        {
            throw new HubException("Match config is unavailable.");
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("MatchStarting", lobbyId, startResult.Value.MatchConfig);
    }

    public async Task RemoveParticipant(Guid lobbyId, string targetParticipantId)
    {
        ValidateLobbyMembership(lobbyId);
        var participantId = GetCallerParticipantId()!;

        var removeResult = await _lobbyService.RemoveParticipantAsync(
            new RemoveLobbyParticipantRequest(lobbyId, participantId, targetParticipantId),
            CancellationToken.None);
        if (!removeResult.IsSuccess || removeResult.Value is null)
        {
            throw new HubException(removeResult.ErrorCode ?? "Failed to remove participant.");
        }

        _runtimeState.RemoveParticipant(targetParticipantId);

        if (ParticipantConnectionIds.TryGetValue(targetParticipantId, out var targetConnectionId))
        {
            await Groups.RemoveFromGroupAsync(targetConnectionId, LobbyGroupName(lobbyId));
            await Clients.Client(targetConnectionId).SendAsync("RemovedFromLobby", lobbyId, targetParticipantId);
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("LobbyParticipantsChanged", removeResult.Value);
    }

    public async Task SendLobbyChat(Guid lobbyId, string message)
    {
        var lobby = await GetAuthorizedLobbyAsync(lobbyId);
        if (string.IsNullOrWhiteSpace(message))
        {
            throw new HubException("Message cannot be empty.");
        }

        var trimmedMessage = message.Trim();
        if (trimmedMessage.Length > 400)
        {
            throw new HubException("Message too long.");
        }

        var participantId = GetCallerParticipantId()!;
        var sender = lobby.Players.SingleOrDefault(x => x.ParticipantId == participantId);
        if (sender is null)
        {
            throw new HubException("Participant is not a member of this lobby.");
        }

        await Clients.Group(LobbyGroupName(lobbyId)).SendAsync(
            "LobbyChatMessage",
            lobbyId,
            participantId,
            sender.DisplayName,
            trimmedMessage,
            DateTimeOffset.UtcNow);
    }

    public Task ReportPing(Guid lobbyId, int pingMs)
    {
        ValidateLobbyMembership(lobbyId);
        var participantId = GetCallerParticipantId()!;
        _runtimeState.SetParticipantPing(participantId, pingMs);
        return Task.CompletedTask;
    }

    public async Task ReportRuntimeLevelReady(Guid lobbyId)
    {
        var lobby = await GetAuthorizedLobbyAsync(lobbyId);
        var participantId = GetCallerParticipantId()!;
        _runtimeState.MarkRuntimeLevelReady(lobbyId, participantId);
        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("RuntimeLevelReady", lobbyId, participantId);
    }

    public async Task NotifyRuntimeStartNow(Guid lobbyId)
    {
        var lobby = await GetAuthorizedLobbyAsync(lobbyId);
        var participantId = GetCallerParticipantId()!;
        if (lobby.HostParticipantId != participantId)
        {
            throw new HubException("Only the host can start runtime simulation.");
        }

        var allReady = lobby.Players.All(player => _runtimeState.IsRuntimeLevelReady(lobbyId, player.ParticipantId));
        if (!allReady)
        {
            throw new HubException("Not all participants have completed runtime load.");
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("RuntimeStartNow", lobbyId);
        _runtimeState.ClearRuntimeReady(lobbyId);
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

    private void ValidateLobbyMembership(Guid lobbyId)
    {
        if (!Context.Items.TryGetValue("lobbyId", out var stored) ||
            stored is not Guid storedId ||
            storedId != lobbyId)
        {
            throw new HubException("Caller has not joined this lobby.");
        }
    }

    private static void ValidateSdpSize(string sdp)
    {
        // SDP descriptions are typically a few KB; cap at 64 KB to prevent abuse
        if (sdp.Length > 65536)
        {
            throw new HubException("SDP payload too large.");
        }
    }

    private async Task<MultiplayerLobbyDetails> GetAuthorizedLobbyAsync(Guid lobbyId)
    {
        ValidateLobbyMembership(lobbyId);
        var participantId = GetCallerParticipantId();
        if (participantId is null)
        {
            throw new HubException("Caller has no participant identity.");
        }

        var result = await _lobbyService.GetLobbyAsync(lobbyId, CancellationToken.None);
        if (!result.IsSuccess || result.Value is null)
        {
            throw new HubException("Lobby not found.");
        }

        if (result.Value.Players.All(p => p.ParticipantId != participantId))
        {
            throw new HubException("Participant is not a member of this lobby.");
        }

        return result.Value;
    }

    private static void ValidateTargetParticipant(MultiplayerLobbyDetails lobby, string targetParticipantId)
    {
        if (lobby.Players.All(p => p.ParticipantId != targetParticipantId))
        {
            throw new HubException("Target participant is not a member of this lobby.");
        }
    }

    private static void ValidateSignalingAllowed(MultiplayerLobbyDetails lobby)
    {
        if (lobby.State == "started")
        {
            throw new HubException("Signaling is closed after gameplay starts.");
        }
    }

    private static string GetTargetConnectionId(string targetParticipantId)
    {
        if (!ParticipantConnectionIds.TryGetValue(targetParticipantId, out var connectionId))
        {
            throw new HubException("Target participant is not connected.");
        }

        return connectionId;
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
