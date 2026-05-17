using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PangeaRSEdit.Application.Multiplayer;
using PangeaRSEdit.Infrastructure.Persistence;

namespace PangeaRSEdit.Tests;

public sealed class MultiplayerLobbyApiTests : IClassFixture<PangeaApiFactory>
{
    private readonly PangeaApiFactory _factory;

    public MultiplayerLobbyApiTests(PangeaApiFactory factory)
    {
        _factory = factory;
    }

    private static async Task<(Guid LobbyId, string HostParticipantId)> CreateLobbyAsync(
        HttpClient hostClient,
        string gameId = "cromagrally",
        string mode = "multiplayerRace",
        string trackOrLevel = "ice-ramp",
        int maxPlayers = 2)
    {
        var createResponse = await hostClient.PostAsJsonAsync("/api/multiplayer/lobbies", new
        {
            gameId,
            mode,
            trackOrLevel,
            maxPlayers,
            displayName = "Host"
        });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        var hostParticipantId = createResponse.Headers.GetValues("X-Participant-Id").Single();
        using var createDocument = JsonDocument.Parse(await createResponse.Content.ReadAsStringAsync());
        var lobbyId = createDocument.RootElement.GetProperty("id").GetGuid();
        return (lobbyId, hostParticipantId);
    }

    [Fact]
    public async Task CreateLobby_AssignsHostAsPlayerZero()
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
        var hostParticipantId = response.Headers.GetValues("X-Participant-Id").Single();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var players = document.RootElement.GetProperty("players").EnumerateArray().ToArray();
        Assert.Single(players);
        Assert.Equal(hostParticipantId, players[0].GetProperty("participantId").GetString());
        Assert.Equal(0, players[0].GetProperty("playerIndex").GetInt32());
        Assert.True(players[0].GetProperty("isHost").GetBoolean());
        Assert.Equal("open", document.RootElement.GetProperty("state").GetString());
    }

    [Fact]
    public async Task JoinLobby_AssignsNextPlayerIndex()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, _) = await CreateLobbyAsync(hostClient);

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-player-1");

        var joinResponse = await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        using var joinedDocument = JsonDocument.Parse(await joinResponse.Content.ReadAsStringAsync());
        var players = joinedDocument.RootElement.GetProperty("players").EnumerateArray().ToArray();
        Assert.Equal(2, players.Length);
        Assert.Equal(0, players[0].GetProperty("playerIndex").GetInt32());
        Assert.Equal(1, players[1].GetProperty("playerIndex").GetInt32());
    }

    [Fact]
    public async Task LobbyPreview_ReturnsJoinMetadataWithoutJoining()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, _) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        var previewClient = _factory.CreateClient();
        var previewResponse = await previewClient.GetAsync($"/api/multiplayer/lobbies/{lobbyId}/preview");
        Assert.Equal(HttpStatusCode.OK, previewResponse.StatusCode);

        using var previewDocument = JsonDocument.Parse(await previewResponse.Content.ReadAsStringAsync());
        Assert.Equal(lobbyId, previewDocument.RootElement.GetProperty("id").GetGuid());
        Assert.Equal("open", previewDocument.RootElement.GetProperty("state").GetString());
        Assert.Equal(1, previewDocument.RootElement.GetProperty("playerCount").GetInt32());
        Assert.True(previewDocument.RootElement.GetProperty("canJoin").GetBoolean());
    }

    [Fact]
    public async Task JoinLobby_RejectsFullLobby()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-1");
        var joinResponse = await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var thirdClient = _factory.CreateClient();
        thirdClient.DefaultRequestHeaders.Add("X-Participant-Id", "third-1");
        var overfillResponse = await thirdClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Third"
        });

        Assert.Equal(HttpStatusCode.Conflict, overfillResponse.StatusCode);
    }

    [Fact]
    public async Task JoinLobby_RejectsStartedLobby()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-1");
        var joinResponse = await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var hostReadyClient = _factory.CreateClient();
        hostReadyClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);
        await hostReadyClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });
        await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });
        var startResponse = await hostReadyClient.PostAsync($"/api/multiplayer/lobbies/{lobbyId}/start", null);
        Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);

        var lateClient = _factory.CreateClient();
        lateClient.DefaultRequestHeaders.Add("X-Participant-Id", "late-1");
        var lateJoinResponse = await lateClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Late"
        });
        Assert.Equal(HttpStatusCode.BadRequest, lateJoinResponse.StatusCode);
    }

    [Fact]
    public async Task JoinLobby_RejectsExpiredLobby()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, _) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
            var lobby = await db.MultiplayerLobbies.FindAsync(lobbyId);
            Assert.NotNull(lobby);
            lobby!.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-expired");
        var joinResponse = await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.BadRequest, joinResponse.StatusCode);
    }

    [Fact]
    public async Task StartLobby_RejectsNonHost()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-player");
        await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });

        var hostReadyClient = _factory.CreateClient();
        hostReadyClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);
        await hostReadyClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });
        await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });

        var nonHostStart = await guestClient.PostAsync($"/api/multiplayer/lobbies/{lobbyId}/start", null);
        Assert.Equal(HttpStatusCode.Forbidden, nonHostStart.StatusCode);
    }

    [Fact]
    public async Task StartLobby_RejectsMissingReadyParticipants()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-player");
        await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });

        var hostReadyClient = _factory.CreateClient();
        hostReadyClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);
        await hostReadyClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });

        var startResponse = await hostReadyClient.PostAsync($"/api/multiplayer/lobbies/{lobbyId}/start", null);
        Assert.Equal(HttpStatusCode.BadRequest, startResponse.StatusCode);
    }

    [Fact]
    public async Task StartLobby_ReturnsStableMatchConfigOnRepeatedReads()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, gameId: "nanosaur2", mode: "battle", trackOrLevel: "battle1");

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-player-1");
        var joinResponse = await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        var hostReadyClient = _factory.CreateClient();
        hostReadyClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);
        await hostReadyClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });
        await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/ready", new { isReady = true });

        var startResponse = await hostReadyClient.PostAsync($"/api/multiplayer/lobbies/{lobbyId}/start", null);
        Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);
        using var startDocument = JsonDocument.Parse(await startResponse.Content.ReadAsStringAsync());
        var firstMatchConfig = startDocument.RootElement.GetProperty("matchConfig");
        var firstMatchId = firstMatchConfig.GetProperty("matchId").GetGuid();
        var firstSeed = firstMatchConfig.GetProperty("seed").GetInt32();

        var readResponse = await hostReadyClient.GetAsync($"/api/multiplayer/lobbies/{lobbyId}");
        Assert.Equal(HttpStatusCode.OK, readResponse.StatusCode);
        using var readDocument = JsonDocument.Parse(await readResponse.Content.ReadAsStringAsync());
        var secondMatchConfig = readDocument.RootElement.GetProperty("matchConfig");
        var secondMatchId = secondMatchConfig.GetProperty("matchId").GetGuid();
        var secondSeed = secondMatchConfig.GetProperty("seed").GetInt32();

        Assert.Equal(firstMatchId, secondMatchId);
        Assert.Equal(firstSeed, secondSeed);
        Assert.True(firstSeed > 0);

        var players = secondMatchConfig.GetProperty("players").EnumerateArray().ToArray();
        Assert.Equal(2, players.Length);
        Assert.Equal(0, players[0].GetProperty("playerIndex").GetInt32());
        Assert.Equal(1, players[1].GetProperty("playerIndex").GetInt32());
    }

    [Fact]
    public async Task StartLobby_RejectsExpiredLobby()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
            var lobby = await db.MultiplayerLobbies.FindAsync(lobbyId);
            Assert.NotNull(lobby);
            lobby!.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }

        var hostReadyClient = _factory.CreateClient();
        hostReadyClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);
        var startResponse = await hostReadyClient.PostAsync($"/api/multiplayer/lobbies/{lobbyId}/start", null);
        Assert.Equal(HttpStatusCode.BadRequest, startResponse.StatusCode);
    }

    [Fact]
    public async Task Heartbeat_UpdatesParticipantLastSeen()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
            var player = await db.MultiplayerLobbyPlayers
                .SingleAsync(x => x.LobbyId == lobbyId && x.ParticipantId == hostParticipantId);
            player.LastSeenAt = DateTimeOffset.UtcNow.AddHours(-2);
            await db.SaveChangesAsync();
        }

        var heartbeatClient = _factory.CreateClient();
        heartbeatClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);
        var heartbeatResponse = await heartbeatClient.PostAsync($"/api/multiplayer/lobbies/{lobbyId}/heartbeat", null);
        Assert.Equal(HttpStatusCode.OK, heartbeatResponse.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
            var player = await db.MultiplayerLobbyPlayers
                .SingleAsync(x => x.LobbyId == lobbyId && x.ParticipantId == hostParticipantId);
            Assert.True(player.LastSeenAt > DateTimeOffset.UtcNow.AddMinutes(-1));
        }
    }

    [Fact]
    public async Task ReportEndpoints_PersistEventAndEndLobby()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, maxPlayers: 2);
        var reportClient = _factory.CreateClient();
        reportClient.DefaultRequestHeaders.Add("X-Participant-Id", hostParticipantId);

        var desyncResponse = await reportClient.PostAsJsonAsync(
            $"/api/multiplayer/lobbies/{lobbyId}/report/desync",
            new { detail = "hash mismatch frame 120" });
        Assert.Equal(HttpStatusCode.OK, desyncResponse.StatusCode);

        using var responseDocument = JsonDocument.Parse(await desyncResponse.Content.ReadAsStringAsync());
        Assert.Equal("ended", responseDocument.RootElement.GetProperty("state").GetString());

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
            var lobby = await db.MultiplayerLobbies.FindAsync(lobbyId);
            Assert.NotNull(lobby);
            Assert.Equal("desync-reported", lobby!.LastReportType);
            Assert.Equal("hash mismatch frame 120", lobby.LastReportDetail);
            Assert.Equal(hostParticipantId, lobby.LastReportByParticipantId);
            Assert.Equal("ended", lobby.State);
            Assert.NotNull(lobby.MatchEndedAt);
        }
    }

    [Fact]
    public async Task IceServersEndpoint_ReturnsConfiguredOrDefaultStun()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/multiplayer/ice-servers");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var servers = document.RootElement.GetProperty("iceServers").EnumerateArray().ToArray();
        Assert.NotEmpty(servers);
        var urls = servers[0].GetProperty("urls").EnumerateArray().Select(x => x.GetString()).ToArray();
        Assert.Contains("stun:stun.l.google.com:19302", urls);
    }

    [Fact]
    public async Task CleanupService_ExpiresStaleLobbyAndRemovesStalePlayers()
    {
        var hostClient = _factory.CreateClient();
        var (lobbyId, hostParticipantId) = await CreateLobbyAsync(hostClient, maxPlayers: 2);

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Add("X-Participant-Id", "guest-cleanup");
        var joinResponse = await guestClient.PostAsJsonAsync($"/api/multiplayer/lobbies/{lobbyId}/join", new
        {
            displayName = "Guest"
        });
        Assert.Equal(HttpStatusCode.OK, joinResponse.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
            var lobby = await db.MultiplayerLobbies.SingleAsync(x => x.Id == lobbyId);
            lobby.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            var players = await db.MultiplayerLobbyPlayers.Where(x => x.LobbyId == lobbyId).ToListAsync();
            foreach (var player in players)
            {
                player.LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-10);
            }
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<IMultiplayerLobbyService>();
            await service.CleanupExpiredAndStaleAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PangeaRSEditDbContext>();
            var lobby = await db.MultiplayerLobbies.SingleAsync(x => x.Id == lobbyId);
            Assert.Equal("expired", lobby.State);
            var players = await db.MultiplayerLobbyPlayers.Where(x => x.LobbyId == lobbyId).ToListAsync();
            Assert.Empty(players);
        }
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

        var matchConfig = startDocument.RootElement.GetProperty("matchConfig");
        Assert.Equal("nanosaur2", matchConfig.GetProperty("gameId").GetString());
        Assert.Equal("battle", matchConfig.GetProperty("mode").GetString());
        Assert.Equal("battle1", matchConfig.GetProperty("trackOrLevel").GetString());
        Assert.True(matchConfig.GetProperty("seed").GetInt32() > 0);

        var players = matchConfig.GetProperty("players").EnumerateArray().ToArray();
        Assert.Equal(2, players.Length);
        Assert.Equal(0, players[0].GetProperty("playerIndex").GetInt32());
        Assert.Equal(1, players[1].GetProperty("playerIndex").GetInt32());
    }
}
