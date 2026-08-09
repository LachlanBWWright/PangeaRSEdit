using System.Diagnostics.Metrics;

namespace PangeaRSEdit.Infrastructure.Multiplayer;

public static class MultiplayerMetrics
{
    private static readonly Meter Meter = new("PangeaRSEdit.Multiplayer", "1.0.0");
    private static readonly Counter<long> LobbyCreatedCounter = Meter.CreateCounter<long>("multiplayer.lobby.created");
    private static readonly Counter<long> LobbyJoinedCounter = Meter.CreateCounter<long>("multiplayer.lobby.joined");
    private static readonly Counter<long> MatchStartedCounter = Meter.CreateCounter<long>("multiplayer.match.started");
    private static readonly Counter<long> MatchEndedCounter = Meter.CreateCounter<long>("multiplayer.match.ended");
    private static readonly Counter<long> ReportCounter = Meter.CreateCounter<long>("multiplayer.report.received");
    private static readonly Counter<long> RejectedResultCounter = Meter.CreateCounter<long>("multiplayer.result.rejected");
    private static readonly Histogram<double> MatchDurationSeconds = Meter.CreateHistogram<double>("multiplayer.match.duration", "s");

    public static void LobbyCreated(string gameId, string mode)
    {
        LobbyCreatedCounter.Add(1, new("game", gameId), new("mode", mode));
    }

    public static void LobbyJoined(string gameId, string mode)
    {
        LobbyJoinedCounter.Add(1, new("game", gameId), new("mode", mode));
    }

    public static void MatchStarted(string gameId, string mode)
    {
        MatchStartedCounter.Add(1, new("game", gameId), new("mode", mode));
    }

    public static void MatchEnded(string gameId, string mode, string reason, DateTimeOffset? startedAt, DateTimeOffset endedAt)
    {
        MatchEndedCounter.Add(1, new("game", gameId), new("mode", mode), new("reason", reason));
        if (startedAt.HasValue)
        {
            MatchDurationSeconds.Record(
                Math.Max(0, (endedAt - startedAt.Value).TotalSeconds),
                new("game", gameId),
                new("mode", mode));
        }
    }

    public static void ReportReceived(string gameId, string mode, string reportType)
    {
        ReportCounter.Add(1, new("game", gameId), new("mode", mode), new("report_type", reportType));
    }

    public static void ResultRejected(string reason)
    {
        RejectedResultCounter.Add(1, new KeyValuePair<string, object?>[]
        {
            new("reason", reason)
        });
    }
}
