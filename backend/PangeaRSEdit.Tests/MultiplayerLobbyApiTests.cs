using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace PangeaRSEdit.Tests;

public sealed class MultiplayerLobbyApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public MultiplayerLobbyApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateLobby_ReturnsLobbyDetailsWithParticipantHeader()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/multiplayer/lobbies", new
        {
            gameId = "cromagrally",
            mode = "multiplayerRace",
            trackOrLevel = "ice-ramp",
            maxPlayers = 4,
            displayName = "Host"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.Contains("X-Participant-Id"));

        var json = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(json);
        Assert.True(document.RootElement.TryGetProperty("id", out var idProperty));
        Assert.True(idProperty.TryGetGuid(out _));
        Assert.Equal("open", document.RootElement.GetProperty("state").GetString());
    }

    [Fact]
    public async Task JoinReadyAndStartLobby_FollowsExpectedStateTransition()
    {
        var hostClient = _factory.CreateClient();

        var createResponse = await hostClient.PostAsJsonAsync("/api/multiplayer/lobbies", new
        {
            gameId = "nanosaur2",
            mode = "battle",
            trackOrLevel = "battle1",
            maxPlayers = 2,
            displayName = "Host"
        });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        var hostParticipantId = createResponse.Headers.GetValues("X-Participant-Id").Single();
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDocument = JsonDocument.Parse(createJson);
        var lobbyId = createDocument.RootElement.GetProperty("id").GetGuid();

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-player-1");

        var joinResponse = await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
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

        var guestReadyResponse = await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new
        {
            isReady = true
        });

        Assert.Equal(HttpStatusCode.OK, guestReadyResponse.StatusCode);

        var startResponse = await hostReadyClient.PostAsync($"/api/multiplayer/lobbies/{lobbyId}/start", null);
        Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);

        var startJson = await startResponse.Content.ReadAsStringAsync();
        using var startDocument = JsonDocument.Parse(startJson);
        Assert.Equal("started", startDocument.RootElement.GetProperty("state").GetString());
    }
}
