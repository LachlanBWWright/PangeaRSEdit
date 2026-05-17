using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace PangeaRSEdit.Tests;

public sealed class MultiplayerHubApiTests : IClassFixture<PangeaApiFactory>
{
    private readonly PangeaApiFactory _factory;

    public MultiplayerHubApiTests(PangeaApiFactory factory)
    {
        _factory = factory;
    }

    private static async Task<(Guid LobbyId, string HostParticipantId)> CreateLobbyAsync(HttpClient client)
    {
        var createLobbyResponse = await client.PostAsJsonAsync("/api/multiplayer/lobbies", new
        {
            gameId = "cromagrally",
            mode = "multiplayerRace",
            trackOrLevel = "ice-ramp",
            maxPlayers = 2,
            displayName = "Host"
        });

        Assert.Equal(HttpStatusCode.OK, createLobbyResponse.StatusCode);
        var hostParticipantId = createLobbyResponse.Headers.GetValues("X-Participant-Id").Single();

        using var lobbyDocument = JsonDocument.Parse(await createLobbyResponse.Content.ReadAsStringAsync());
        var lobbyId = lobbyDocument.RootElement.GetProperty("id").GetGuid();
        return (lobbyId, hostParticipantId);
    }

    [Fact]
    public async Task NotifyMatchStarting_BroadcastsServerIssuedMatchConfig()
    {
        var hostHttp = _factory.CreateClient();
        var guestHttp = _factory.CreateClient();

        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostHttp);

        guestHttp.DefaultRequestHeaders.Add("X-Participant-Id", "guest-1");
        var joinResponse = await guestHttp.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var hostReadyClient = _factory.CreateClient();
        hostReadyClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);
        var hostReadyResponse = await hostReadyClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new
        {
            isReady = true
        });
        Assert.Equal(HttpStatusCode.OK, hostReadyResponse.StatusCode);

        var guestReadyResponse = await guestHttp.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new
        {
            isReady = true
        });
        Assert.Equal(HttpStatusCode.OK, guestReadyResponse.StatusCode);

        var guestMatchStartingTcs = new TaskCompletionSource<(Guid LobbyId, JsonElement MatchConfig)>(TaskCreationOptions.RunContinuationsAsynchronously);

        var hostHub = CreateHubConnection();
        var guestHub = CreateHubConnection();

        guestHub.On<Guid, JsonElement>("MatchStarting", (eventLobbyId, matchConfig) =>
        {
            guestMatchStartingTcs.TrySetResult((eventLobbyId, matchConfig));
        });

        await hostHub.StartAsync();
        await guestHub.StartAsync();

        await hostHub.InvokeAsync("JoinLobby", lobbyId, hostParticipantId);
        await guestHub.InvokeAsync("JoinLobby", lobbyId, "guest-1");

        await hostHub.InvokeAsync("NotifyMatchStarting", lobbyId);

        var completedTask = await Task.WhenAny(
            guestMatchStartingTcs.Task,
            Task.Delay(TimeSpan.FromSeconds(5)));

        Assert.True(completedTask == guestMatchStartingTcs.Task, "Timed out waiting for MatchStarting event.");
        var (eventLobbyId, matchConfig) = await guestMatchStartingTcs.Task;
        Assert.Equal(lobbyId, eventLobbyId);

        Assert.Equal("cromagrally", matchConfig.GetProperty("gameId").GetString());
        Assert.Equal("multiplayerRace", matchConfig.GetProperty("mode").GetString());
        Assert.Equal("ice-ramp", matchConfig.GetProperty("trackOrLevel").GetString());
        Assert.True(matchConfig.GetProperty("seed").GetInt32() > 0);

        var players = matchConfig.GetProperty("players").EnumerateArray().ToArray();
        Assert.Equal(2, players.Length);

        await hostHub.DisposeAsync();
        await guestHub.DisposeAsync();
    }

    [Fact]
    public async Task JoinLobby_RejectsUnknownParticipant()
    {
        var hostHttp = _factory.CreateClient();
        var (lobbyId, _) = await CreateLobbyAsync(hostHttp);

        var intruderHub = CreateHubConnection();
        await intruderHub.StartAsync();

        await Assert.ThrowsAsync<HubException>(() =>
            intruderHub.InvokeAsync("JoinLobby", lobbyId, "unknown-participant"));

        await intruderHub.DisposeAsync();
    }

    [Fact]
    public async Task OfferAnswerAndIceRelay_RejectNonMemberTarget()
    {
        var hostHttp = _factory.CreateClient();
        var guestHttp = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostHttp);

        guestHttp.DefaultRequestHeaders.Add("X-Participant-Id", "guest-1");
        var joinResponse = await guestHttp.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var hostHub = CreateHubConnection();
        await hostHub.StartAsync();
        await hostHub.InvokeAsync("JoinLobby", lobbyId, hostParticipantId);

        await Assert.ThrowsAsync<HubException>(() =>
            hostHub.InvokeAsync("SendOffer", lobbyId, "not-a-member", "offer-sdp"));
        await Assert.ThrowsAsync<HubException>(() =>
            hostHub.InvokeAsync("SendAnswer", lobbyId, "not-a-member", "answer-sdp"));
        await Assert.ThrowsAsync<HubException>(() =>
            hostHub.InvokeAsync("SendIceCandidate", lobbyId, "not-a-member", "candidate"));

        await hostHub.DisposeAsync();
    }

    [Fact]
    public async Task RelayMessages_AreDeliveredOnlyToTargetPeer()
    {
        var hostHttp = _factory.CreateClient();
        var guestHttp = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostHttp);

        guestHttp.DefaultRequestHeaders.Add("X-Participant-Id", "guest-1");
        var joinResponse = await guestHttp.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var hostHub = CreateHubConnection();
        var guestHub = CreateHubConnection();
        var guestOfferTcs = new TaskCompletionSource<(string FromId, string TargetId, string Sdp)>(TaskCreationOptions.RunContinuationsAsynchronously);
        var hostOfferTcs = new TaskCompletionSource<(string FromId, string TargetId, string Sdp)>(TaskCreationOptions.RunContinuationsAsynchronously);

        guestHub.On<string, string, string>("ReceiveOffer", (fromId, targetId, sdp) =>
        {
            guestOfferTcs.TrySetResult((fromId, targetId, sdp));
        });
        hostHub.On<string, string, string>("ReceiveOffer", (fromId, targetId, sdp) =>
        {
            hostOfferTcs.TrySetResult((fromId, targetId, sdp));
        });

        await hostHub.StartAsync();
        await guestHub.StartAsync();
        await hostHub.InvokeAsync("JoinLobby", lobbyId, hostParticipantId);
        await guestHub.InvokeAsync("JoinLobby", lobbyId, "guest-1");

        await hostHub.InvokeAsync("SendOffer", lobbyId, "guest-1", "offer-sdp");
        var completed = await Task.WhenAny(guestOfferTcs.Task, Task.Delay(TimeSpan.FromSeconds(5)));
        Assert.True(completed == guestOfferTcs.Task, "Guest did not receive relay offer.");
        var guestOffer = await guestOfferTcs.Task;
        Assert.Equal(hostParticipantId, guestOffer.FromId);
        Assert.Equal("guest-1", guestOffer.TargetId);
        Assert.Equal("offer-sdp", guestOffer.Sdp);
        Assert.False(hostOfferTcs.Task.IsCompleted);

        await hostHub.DisposeAsync();
        await guestHub.DisposeAsync();
    }

    [Fact]
    public async Task SignalingRejectedAfterMatchStarted()
    {
        var hostHttp = _factory.CreateClient();
        var guestHttp = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostHttp);

        guestHttp.DefaultRequestHeaders.Add("X-Participant-Id", "guest-1");
        var joinResponse = await guestHttp.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var hostReadyClient = _factory.CreateClient();
        hostReadyClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);
        await hostReadyClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });
        await guestHttp.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });
        var startResponse = await hostReadyClient.PostAsync($"/api/multiplayer/lobbies/{lobbyId}/start", null);
        Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);

        var hostHub = CreateHubConnection();
        await hostHub.StartAsync();
        await hostHub.InvokeAsync("JoinLobby", lobbyId, hostParticipantId);
        await Assert.ThrowsAsync<HubException>(() =>
            hostHub.InvokeAsync("SendOffer", lobbyId, "guest-1", "offer-after-start"));

        await hostHub.DisposeAsync();
    }

    [Fact]
    public async Task GuestDisconnect_BroadcastsParticipantDisconnected()
    {
        var hostHttp = _factory.CreateClient();
        var guestHttp = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostHttp);
        guestHttp.DefaultRequestHeaders.Add("X-Participant-Id", "guest-1");
        var joinResponse = await guestHttp.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var hostHub = CreateHubConnection();
        var guestHub = CreateHubConnection();
        var participantDisconnectedTcs = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        hostHub.On<string>("ParticipantDisconnected", participantId =>
        {
            participantDisconnectedTcs.TrySetResult(participantId);
        });

        await hostHub.StartAsync();
        await guestHub.StartAsync();
        await hostHub.InvokeAsync("JoinLobby", lobbyId, hostParticipantId);
        await guestHub.InvokeAsync("JoinLobby", lobbyId, "guest-1");

        await guestHub.DisposeAsync();

        var completed = await Task.WhenAny(participantDisconnectedTcs.Task, Task.Delay(TimeSpan.FromSeconds(5)));
        Assert.True(completed == participantDisconnectedTcs.Task, "ParticipantDisconnected not received.");
        Assert.Equal("guest-1", await participantDisconnectedTcs.Task);

        await hostHub.DisposeAsync();
    }

    [Fact]
    public async Task HostDisconnect_BroadcastsHostDisconnected()
    {
        var hostHttp = _factory.CreateClient();
        var guestHttp = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostHttp);
        guestHttp.DefaultRequestHeaders.Add("X-Participant-Id", "guest-1");
        var joinResponse = await guestHttp.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var hostHub = CreateHubConnection();
        var guestHub = CreateHubConnection();
        var hostDisconnectedTcs = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        guestHub.On<string>("HostDisconnected", participantId =>
        {
            hostDisconnectedTcs.TrySetResult(participantId);
        });

        await hostHub.StartAsync();
        await guestHub.StartAsync();
        await hostHub.InvokeAsync("JoinLobby", lobbyId, hostParticipantId);
        await guestHub.InvokeAsync("JoinLobby", lobbyId, "guest-1");

        await hostHub.DisposeAsync();

        var completed = await Task.WhenAny(hostDisconnectedTcs.Task, Task.Delay(TimeSpan.FromSeconds(5)));
        Assert.True(completed == hostDisconnectedTcs.Task, "HostDisconnected not received.");
        Assert.Equal(hostParticipantId, await hostDisconnectedTcs.Task);

        await guestHub.DisposeAsync();
    }

    private HubConnection CreateHubConnection()
    {
        var baseAddress = _factory.Server.BaseAddress;
        var hubUri = new Uri(baseAddress, "/api/multiplayer/signaling");

        return new HubConnectionBuilder()
            .WithUrl(hubUri, options =>
            {
                options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
            })
            .Build();
    }
}
