using Microsoft.AspNetCore.SignalR;
using PangeaRSEdit.Application.Multiplayer;

namespace PangeaRSEdit.Api.Hubs;

/// <summary>
/// SignalR hub for WebRTC signaling between lobby participants.
/// Participants must be in the same lobby to exchange signaling messages.
/// The hub validates participant membership before relaying any message.
/// </summary>
public sealed class MultiplayerHub : Hub
{
    private readonly IMultiplayerLobbyService _lobbyService;

    public MultiplayerHub(IMultiplayerLobbyService lobbyService)
    {
        _lobbyService = lobbyService;
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
        ValidateLobbyMembership(lobbyId);
        ValidateSdpSize(sdp);
        var fromId = GetCallerParticipantId()!;

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("ReceiveOffer", fromId, targetParticipantId, sdp);
    }

    /// <summary>
    /// Relay a WebRTC answer SDP to a specific peer in the same lobby.
    /// </summary>
    public async Task SendAnswer(Guid lobbyId, string targetParticipantId, string sdp)
    {
        ValidateLobbyMembership(lobbyId);
        ValidateSdpSize(sdp);
        var fromId = GetCallerParticipantId()!;

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("ReceiveAnswer", fromId, targetParticipantId, sdp);
    }

    /// <summary>
    /// Relay a WebRTC ICE candidate to a specific peer in the same lobby.
    /// </summary>
    public async Task SendIceCandidate(Guid lobbyId, string targetParticipantId, string candidate)
    {
        ValidateLobbyMembership(lobbyId);
        if (candidate.Length > 4096)
        {
            throw new HubException("ICE candidate payload too large.");
        }

        var fromId = GetCallerParticipantId()!;

        await Clients.Group(LobbyGroupName(lobbyId))
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
    /// Notify all lobby participants that the match is starting.
    /// Only the lobby host may call this.
    /// </summary>
    public async Task NotifyMatchStarting(Guid lobbyId, object matchConfig)
    {
        ValidateLobbyMembership(lobbyId);
        var participantId = GetCallerParticipantId()!;

        var lobbyResult = await _lobbyService.GetLobbyAsync(lobbyId, CancellationToken.None);
        if (!lobbyResult.IsSuccess)
        {
            throw new HubException("Lobby not found.");
        }

        if (lobbyResult.Value!.HostParticipantId != participantId)
        {
            throw new HubException("Only the lobby host can start the match.");
        }

        await Clients.Group(LobbyGroupName(lobbyId))
            .SendAsync("MatchStarting", lobbyId, matchConfig);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var lobbyId = Context.Items.TryGetValue("lobbyId", out var lid) ? lid as Guid? : null;
        var participantId = GetCallerParticipantId();

        if (lobbyId.HasValue && participantId is not null)
        {
            await _lobbyService.LeaveLobbyAsync(
                new LeaveLobbyRequest(lobbyId.Value, participantId),
                CancellationToken.None);

            await Clients.OthersInGroup(LobbyGroupName(lobbyId.Value))
                .SendAsync("PeerDisconnected", participantId);
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
}
