using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace PangeaRSEdit.Api.Hubs
{
    public sealed class LspSession
    {
        public string ConnectionId { get; set; } = string.Empty;
        public string TempDirectory { get; set; } = string.Empty;
        public Process? Process { get; set; }
        internal LspMessageTransport? Transport { get; set; }
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;
        public CancellationTokenSource Cts { get; } = new CancellationTokenSource();
        public ConcurrentDictionary<string, byte> Files { get; } = new();
    }

    public sealed class LspHub : Hub
    {
        private static readonly ConcurrentDictionary<string, LspSession> Sessions = new();

        private static readonly Timer CleanupTimer = new(CleanupIdleSessions, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));

        private static void CleanupIdleSessions(object? state)
        {
            var now = DateTime.UtcNow;
            foreach (var pair in Sessions)
            {
                if (now - pair.Value.LastActivity > TimeSpan.FromMinutes(15))
                {
                    if (Sessions.TryRemove(pair.Key, out var session))
                    {
                        CleanupSession(session);
                    }
                }
            }
        }

        private static void CleanupSession(LspSession session)
        {
            session.Cts.Cancel();
            try
            {
                if (session.Process != null && !session.Process.HasExited)
                {
                    session.Process.Kill(entireProcessTree: true);
                }
            }
            catch { }

            session.Process?.Dispose();
            session.Cts.Dispose();

            try
            {
                if (Directory.Exists(session.TempDirectory))
                {
                    Directory.Delete(session.TempDirectory, recursive: true);
                }
            }
            catch { }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (Sessions.TryRemove(Context.ConnectionId, out var session))
            {
                CleanupSession(session);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public Task<string> InitializeSession(string gameId)
        {
            if (Sessions.TryGetValue(Context.ConnectionId, out var existingSession))
            {
                return Task.FromResult(new Uri(existingSession.TempDirectory + Path.DirectorySeparatorChar).AbsoluteUri);
            }

            if (string.IsNullOrWhiteSpace(gameId) || gameId.Length > 64)
            {
                throw new HubException("Invalid game ID.");
            }

            // Enforce concurrent session limit (e.g. max 50 total active sessions on the server)
            if (Sessions.Count >= 50)
            {
                throw new HubException("Server concurrent LuaLS session limit exceeded.");
            }

            var uniqueId = Guid.NewGuid().ToString();
            var workspacePath = Path.Combine(Directory.GetCurrentDirectory(), ".tmp", "lsp", uniqueId);

            Directory.CreateDirectory(workspacePath);
            Directory.CreateDirectory(Path.Combine(workspacePath, "Data", "Scripts", "src"));
            Directory.CreateDirectory(Path.Combine(workspacePath, "Data", "Scripts", "types"));

            // Locate lua-language-server
            string? lualsExecutable = FindLuaLanguageServer();
            if (lualsExecutable == null)
            {
                try
                {
                    Directory.Delete(workspacePath, recursive: true);
                }
                catch { }
                throw new HubException("LuaLS language server not found on host system.");
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = lualsExecutable,
                Arguments = $"--logpath=\"{Path.Combine(workspacePath, "logs")}\" --metapath=\"{Path.Combine(workspacePath, "meta")}\"",
                WorkingDirectory = workspacePath,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            Process? process;
            try
            {
                process = Process.Start(startInfo);
            }
            catch (Exception ex)
            {
                try
                {
                    Directory.Delete(workspacePath, recursive: true);
                }
                catch { }
                throw new HubException($"Failed to start LuaLS process: {ex.Message}");
            }

            if (process == null)
            {
                try
                {
                    Directory.Delete(workspacePath, recursive: true);
                }
                catch { }
                throw new HubException("Failed to start LuaLS process (returned null).");
            }

            var session = new LspSession
            {
                ConnectionId = Context.ConnectionId,
                TempDirectory = workspacePath,
                Process = process,
                Transport = new LspMessageTransport(process.StandardOutput.BaseStream, process.StandardInput.BaseStream),
                LastActivity = DateTime.UtcNow
            };

            Sessions[Context.ConnectionId] = session;

            // Start background tasks to read stdout/stderr and forward them
            _ = Task.Run(() => ReadMessages(session));
            _ = Task.Run(() => ReadErrors(process.StandardError, session));

            return Task.FromResult(new Uri(workspacePath + Path.DirectorySeparatorChar).AbsoluteUri);
        }

        private async Task ReadMessages(LspSession session)
        {
            try
            {
                while (!session.Cts.Token.IsCancellationRequested && session.Transport != null)
                {
                    var payload = await session.Transport.ReadPayloadAsync(session.Cts.Token);
                    if (payload == null) break;
                    await Clients.Client(session.ConnectionId).SendAsync("ReceiveLspPayload", payload, session.Cts.Token);
                }
            }
            catch { }
        }

        private async Task ReadErrors(StreamReader reader, LspSession session)
        {
            try
            {
                while (!session.Cts.Token.IsCancellationRequested)
                {
                    var line = await reader.ReadLineAsync(session.Cts.Token);
                    if (line == null) break;
                    await Clients.Client(session.ConnectionId).SendAsync("ReceiveLspError", line, session.Cts.Token);
                }
            }
            catch { }
        }

        public async Task SyncFile(string path, string content)
        {
            if (!Sessions.TryGetValue(Context.ConnectionId, out var session))
            {
                throw new HubException("Session not initialized.");
            }

            session.LastActivity = DateTime.UtcNow;

            if (content.Length > 1024 * 1024 ||
                !TryResolveWorkspacePath(session, path, out var fullPath, out var normalizedPath))
            {
                throw new HubException("Invalid or oversized workspace file.");
            }
            if (!session.Files.ContainsKey(normalizedPath) && session.Files.Count >= 256)
            {
                throw new HubException("Workspace file limit exceeded.");
            }

            var dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            await File.WriteAllTextAsync(fullPath, content);
            session.Files[normalizedPath] = 0;
        }

        public Task DeleteFile(string path)
        {
            if (!Sessions.TryGetValue(Context.ConnectionId, out var session))
            {
                throw new HubException("Session not initialized.");
            }

            session.LastActivity = DateTime.UtcNow;

            if (!TryResolveWorkspacePath(session, path, out var fullPath, out var normalizedPath))
            {
                throw new HubException("Invalid workspace file path.");
            }

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }
            session.Files.TryRemove(normalizedPath, out _);
            return Task.CompletedTask;
        }

        public async Task SendLspPayload(string payload)
        {
            if (!Sessions.TryGetValue(Context.ConnectionId, out var session) || session.Transport == null)
            {
                throw new HubException("Session not initialized.");
            }

            session.LastActivity = DateTime.UtcNow;

            try
            {
                if (!await session.Transport.WritePayloadAsync(payload, session.Cts.Token))
                {
                    throw new HubException("LuaLS message size limit exceeded.");
                }
            }
            catch (Exception ex)
            {
                throw new HubException($"Failed to write to LuaLS standard input: {ex.Message}");
            }
        }

        private static bool TryResolveWorkspacePath(
            LspSession session,
            string path,
            out string fullPath,
            out string normalizedPath)
        {
            fullPath = string.Empty;
            normalizedPath = string.Empty;
            if (string.IsNullOrWhiteSpace(path) || Path.IsPathRooted(path))
            {
                return false;
            }

            normalizedPath = path.Replace('\\', '/');
            var workspaceRoot = Path.GetFullPath(session.TempDirectory) + Path.DirectorySeparatorChar;
            var candidate = Path.GetFullPath(Path.Combine(session.TempDirectory, normalizedPath));
            if (!candidate.StartsWith(workspaceRoot, StringComparison.Ordinal))
            {
                return false;
            }

            fullPath = candidate;
            return true;
        }

        private static string? FindLuaLanguageServer()
        {
            var paths = new[]
            {
                "lua-language-server",
                "luals",
                "/usr/bin/lua-language-server",
                "/usr/local/bin/lua-language-server",
                "/opt/lua-language-server/bin/lua-language-server"
            };

            foreach (var path in paths)
            {
                if (CanExecute(path))
                {
                    return path;
                }
            }

            return null;
        }

        private static bool CanExecute(string path)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = path,
                    Arguments = "--version",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var p = Process.Start(psi);
                if (p != null)
                {
                    if (!p.WaitForExit(1000))
                    {
                        p.Kill(entireProcessTree: true);
                        return false;
                    }
                    return p.ExitCode == 0;
                }
            }
            catch { }
            return false;
        }
    }
}
