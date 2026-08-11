using System.Text;
using PangeaRSEdit.Api.Hubs;

namespace PangeaRSEdit.Tests;

public sealed class LspMessageTransportTests
{
    [Fact]
    public async Task ReadsUtf8PayloadUsingByteLength()
    {
        const string payload = "{\"jsonrpc\":\"2.0\",\"method\":\"test\",\"params\":\"héllo 世界\"}";
        var bytes = Encoding.UTF8.GetBytes(payload);
        var framed = Encoding.ASCII.GetBytes($"Content-Length: {bytes.Length}\r\n\r\n")
            .Concat(bytes)
            .ToArray();
        await using var input = new MemoryStream(framed);
        await using var output = new MemoryStream();
        var transport = new LspMessageTransport(input, output);

        var result = await transport.ReadPayloadAsync(CancellationToken.None);

        Assert.Equal(payload, result);
    }

    [Fact]
    public async Task WritesUtf8ByteLengthAndCompletePayload()
    {
        const string payload = "{\"text\":\"héllo 世界\"}";
        await using var input = new MemoryStream();
        await using var output = new MemoryStream();
        var transport = new LspMessageTransport(input, output);

        await transport.WritePayloadAsync(payload, CancellationToken.None);

        var framed = Encoding.UTF8.GetString(output.ToArray());
        var expectedLength = Encoding.UTF8.GetByteCount(payload);
        Assert.Equal($"Content-Length: {expectedLength}\r\n\r\n{payload}", framed);
    }
}
