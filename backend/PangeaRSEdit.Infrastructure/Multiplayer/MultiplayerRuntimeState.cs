using System.Collections.Concurrent;

namespace PangeaRSEdit.Infrastructure.Multiplayer;

public sealed class MultiplayerRuntimeState
{
    private readonly ConcurrentDictionary<Guid, bool> _lobbyVisibility = new();
    private readonly ConcurrentDictionary<string, ParticipantTelemetry> _participantTelemetry = new();
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> _runtimeReadyByLobby = new();

    public void SetLobbyVisibility(Guid lobbyId, bool isPublic)
    {
        _lobbyVisibility[lobbyId] = isPublic;
    }

    public bool IsLobbyPublic(Guid lobbyId)
    {
        return _lobbyVisibility.TryGetValue(lobbyId, out var isPublic) ? isPublic : true;
    }

    public void RemoveLobby(Guid lobbyId)
    {
        _lobbyVisibility.TryRemove(lobbyId, out _);
        _runtimeReadyByLobby.TryRemove(lobbyId, out _);
    }

    public void SetParticipantRegion(string participantId, string region)
    {
        var current = _participantTelemetry.GetOrAdd(participantId, ParticipantTelemetry.Empty);
        _participantTelemetry[participantId] = current with { Region = region };
    }

    public void SetParticipantPing(string participantId, int pingMs)
    {
        var boundedPing = Math.Clamp(pingMs, 0, 9999);
        var current = _participantTelemetry.GetOrAdd(participantId, ParticipantTelemetry.Empty);
        _participantTelemetry[participantId] = current with { PingMs = boundedPing };
    }

    public ParticipantTelemetry GetParticipantTelemetry(string participantId)
    {
        return _participantTelemetry.TryGetValue(participantId, out var telemetry)
            ? telemetry
            : ParticipantTelemetry.Empty;
    }

    public void RemoveParticipant(string participantId)
    {
        _participantTelemetry.TryRemove(participantId, out _);
        foreach (var (_, lobbyReadySet) in _runtimeReadyByLobby)
        {
            lobbyReadySet.TryRemove(participantId, out _);
        }
    }

    public void MarkRuntimeLevelReady(Guid lobbyId, string participantId)
    {
        var readySet = _runtimeReadyByLobby.GetOrAdd(lobbyId, _ => new ConcurrentDictionary<string, byte>());
        readySet[participantId] = 1;
    }

    public bool IsRuntimeLevelReady(Guid lobbyId, string participantId)
    {
        var readySet = _runtimeReadyByLobby.GetValueOrDefault(lobbyId);
        if (readySet is null)
        {
            return false;
        }
        return readySet.ContainsKey(participantId);
    }

    public void ClearRuntimeReady(Guid lobbyId)
    {
        _runtimeReadyByLobby.TryRemove(lobbyId, out _);
    }

    public sealed record ParticipantTelemetry(string Region, int PingMs)
    {
        public static ParticipantTelemetry Empty { get; } = new("unknown", 0);
    }
}
