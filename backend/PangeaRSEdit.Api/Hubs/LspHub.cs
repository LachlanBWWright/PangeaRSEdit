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
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;
        public CancellationTokenSource Cts { get; } = new CancellationTokenSource();
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

        public Task<bool> InitializeSession(string gameId)
        {
            if (Sessions.ContainsKey(Context.ConnectionId))
            {
                return Task.FromResult(true);
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
                LastActivity = DateTime.UtcNow
            };

            Sessions[Context.ConnectionId] = session;

            // Start background tasks to read stdout/stderr and forward them
            _ = Task.Run(() => ReadStream(process.StandardOutput, session, "ReceiveLspMessage"));
            _ = Task.Run(() => ReadStream(process.StandardError, session, "ReceiveLspError"));

            return Task.FromResult(true);
        }

        private async Task ReadStream(StreamReader reader, LspSession session, string clientMethod)
        {
            var buffer = new char[4096];
            try
            {
                while (!session.Cts.Token.IsCancellationRequested && session.Process != null && !session.Process.HasExited)
                {
                    int read = await reader.ReadAsync(buffer, 0, buffer.Length);
                    if (read <= 0) break;
                    var text = new string(buffer, 0, read);
                    await Clients.Client(session.ConnectionId).SendAsync(clientMethod, text);
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

            // Sanitize path to prevent directory traversal
            var sanitizedPath = path.Replace("..", "").TrimStart('/', '\\');
            var fullPath = Path.Combine(session.TempDirectory, sanitizedPath);

            var dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            await File.WriteAllTextAsync(fullPath, content);
        }

        public Task DeleteFile(string path)
        {
            if (!Sessions.TryGetValue(Context.ConnectionId, out var session))
            {
                throw new HubException("Session not initialized.");
            }

            session.LastActivity = DateTime.UtcNow;

            var sanitizedPath = path.Replace("..", "").TrimStart('/', '\\');
            var fullPath = Path.Combine(session.TempDirectory, sanitizedPath);

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }
            return Task.CompletedTask;
        }

        public async Task SendLspMessage(string message)
        {
            if (!Sessions.TryGetValue(Context.ConnectionId, out var session) || session.Process == null)
            {
                throw new HubException("Session not initialized.");
            }

            session.LastActivity = DateTime.UtcNow;

            try
            {
                await session.Process.StandardInput.WriteAsync(message);
                await session.Process.StandardInput.FlushAsync();
            }
            catch (Exception ex)
            {
                throw new HubException($"Failed to write to LuaLS standard input: {ex.Message}");
            }
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
                    p.WaitForExit(1000);
                    return true;
                }
            }
            catch { }
            return false;
        }
    }
}
