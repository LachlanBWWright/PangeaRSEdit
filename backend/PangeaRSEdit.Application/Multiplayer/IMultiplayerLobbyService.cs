using PangeaRSEdit.Application.Common;

namespace PangeaRSEdit.Application.Multiplayer;

public interface IMultiplayerLobbyService
{
    Task<AppResult<MultiplayerLobbyDetails>> CreateLobbyAsync(
        CreateLobbyRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<IReadOnlyList<MultiplayerLobbySummary>>> ListLobbiesAsync(
        string? gameId,
        CancellationToken cancellationToken);

    Task<AppResult<MultiplayerLobbyDetails>> GetLobbyAsync(
        Guid lobbyId,
        CancellationToken cancellationToken);

    Task<AppResult<MultiplayerLobbyDetails>> JoinLobbyAsync(
        JoinLobbyRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<bool>> LeaveLobbyAsync(
        LeaveLobbyRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<MultiplayerLobbyDetails>> SetReadyAsync(
        SetLobbyReadyRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<MultiplayerLobbyDetails>> StartLobbyAsync(
        StartLobbyRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<MultiplayerLobbyDetails>> RemoveParticipantAsync(
        RemoveLobbyParticipantRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<MultiplayerLobbyDetails>> HeartbeatAsync(
        LobbyHeartbeatRequest request,
        CancellationToken cancellationToken);

    Task<AppResult<MultiplayerLobbyDetails>> ReportEventAsync(
        LobbyReportEventRequest request,
        CancellationToken cancellationToken);

    Task CleanupExpiredAndStaleAsync(
        CancellationToken cancellationToken);
}
