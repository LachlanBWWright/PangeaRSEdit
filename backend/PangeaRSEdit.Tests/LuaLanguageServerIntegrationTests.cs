using System.Diagnostics;
using System.Text.Json;
using PangeaRSEdit.Api.Hubs;

namespace PangeaRSEdit.Tests;

public sealed class LuaLanguageServerIntegrationTests
{
    [Fact]
    [Trait("Category", "LuaLSIntegration")]
    public async Task RealServerInitializesAndReportsSyntaxDiagnostics()
    {
        var executable = Environment.GetEnvironmentVariable("LUALS_EXECUTABLE");
        Assert.False(string.IsNullOrWhiteSpace(executable), "Set LUALS_EXECUTABLE to the pinned LuaLS binary for integration tests.");
        var workspace = Path.Combine(Path.GetTempPath(), "pangea-luals-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(workspace);
        var fixturePath = Path.Combine(workspace, "fixture.lua");
        var fixtureUri = new Uri(fixturePath).AbsoluteUri;
        var rootUri = new Uri(workspace + Path.DirectorySeparatorChar).AbsoluteUri;
        using var process = Process.Start(new ProcessStartInfo
        {
            FileName = executable,
            Arguments = $"--logpath=\"{Path.Combine(workspace, "logs")}\" --metapath=\"{Path.Combine(workspace, "meta")}\"",
            WorkingDirectory = workspace,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        });
        Assert.NotNull(process);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        var errors = process.StandardError.ReadToEndAsync(timeout.Token);
        var transport = new LspMessageTransport(process.StandardOutput.BaseStream, process.StandardInput.BaseStream);
        try
        {
            await transport.WritePayloadAsync(JsonSerializer.Serialize(new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "initialize",
                @params = new { processId = (int?)null, rootUri, capabilities = new { textDocument = new { publishDiagnostics = new { }, formatting = new { }, rename = new { } } } }
            }), timeout.Token);
            var initialized = await ReadResponseAsync(transport, 1, timeout.Token);
            Assert.True(initialized.GetProperty("result").TryGetProperty("capabilities", out _));
            Assert.True(initialized.GetProperty("result").GetProperty("capabilities").GetProperty("documentFormattingProvider").GetBoolean());
            await transport.WritePayloadAsync("{\"jsonrpc\":\"2.0\",\"method\":\"initialized\",\"params\":{}}", timeout.Token);
            await transport.WritePayloadAsync(JsonSerializer.Serialize(new
            {
                jsonrpc = "2.0",
                method = "textDocument/didOpen",
                @params = new { textDocument = new { uri = fixtureUri, languageId = "lua", version = 1, text = "local broken = )\n" } }
            }), timeout.Token);
            var foundDiagnostic = false;
            while (!foundDiagnostic)
            {
                var payload = await transport.ReadPayloadAsync(timeout.Token);
                Assert.NotNull(payload);
                using var document = JsonDocument.Parse(payload);
                var message = document.RootElement;
                if (!message.TryGetProperty("method", out var method) || method.GetString() != "textDocument/publishDiagnostics") continue;
                var parameters = message.GetProperty("params");
                foundDiagnostic = parameters.GetProperty("uri").GetString() == fixtureUri && parameters.GetProperty("diagnostics").GetArrayLength() > 0;
            }
            await transport.WritePayloadAsync(JsonSerializer.Serialize(new
            {
                jsonrpc = "2.0",
                method = "textDocument/didChange",
                @params = new { textDocument = new { uri = fixtureUri, version = 2 }, contentChanges = new[] { new { text = "local total=1\nreturn total\n" } } }
            }), timeout.Token);
            await transport.WritePayloadAsync(JsonSerializer.Serialize(new
            {
                jsonrpc = "2.0",
                id = 3,
                method = "textDocument/formatting",
                @params = new { textDocument = new { uri = fixtureUri }, options = new { tabSize = 2, insertSpaces = true } }
            }), timeout.Token);
            var formatting = await ReadResponseAsync(transport, 3, timeout.Token);
            Assert.True(formatting.GetProperty("result").GetArrayLength() > 0);
            await transport.WritePayloadAsync(JsonSerializer.Serialize(new
            {
                jsonrpc = "2.0",
                id = 4,
                method = "textDocument/rename",
                @params = new { textDocument = new { uri = fixtureUri }, position = new { line = 0, character = 6 }, newName = "totalScore" }
            }), timeout.Token);
            var rename = await ReadResponseAsync(transport, 4, timeout.Token);
            Assert.Equal(2, rename.GetProperty("result").GetProperty("changes").GetProperty(fixtureUri).GetArrayLength());
            await transport.WritePayloadAsync("{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"shutdown\",\"params\":null}", timeout.Token);
            await ReadResponseAsync(transport, 2, timeout.Token);
            await transport.WritePayloadAsync("{\"jsonrpc\":\"2.0\",\"method\":\"exit\",\"params\":null}", timeout.Token);
            process.StandardInput.Close();
            await process.WaitForExitAsync(timeout.Token);
            Assert.Equal(0, process.ExitCode);
            await errors;
        }
        finally
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync(CancellationToken.None);
            Directory.Delete(workspace, recursive: true);
        }
    }

    private static async Task<JsonElement> ReadResponseAsync(LspMessageTransport transport, int id, CancellationToken token)
    {
        while (true)
        {
            var payload = await transport.ReadPayloadAsync(token);
            Assert.NotNull(payload);
            using var document = JsonDocument.Parse(payload);
            if (document.RootElement.TryGetProperty("id", out var responseId) && responseId.ValueKind == JsonValueKind.Number && responseId.GetInt32() == id)
            {
                return document.RootElement.Clone();
            }
        }
    }
}
