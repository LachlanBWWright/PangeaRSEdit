using System.Text;

namespace PangeaRSEdit.Api.Hubs;

public sealed class LspMessageTransport
{
    private const int MaxMessageBytes = 4 * 1024 * 1024;
    private const int MaxBufferBytes = MaxMessageBytes + 1024;
    private static readonly byte[] HeaderSeparator = "\r\n\r\n"u8.ToArray();
    private readonly Stream _input;
    private readonly Stream _output;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private byte[] _buffer = new byte[8192];
    private int _bufferLength;

    public LspMessageTransport(Stream input, Stream output)
    {
        _input = input;
        _output = output;
    }

    public async Task<bool> WritePayloadAsync(string payload, CancellationToken cancellationToken)
    {
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        if (payloadBytes.Length > MaxMessageBytes)
        {
            return false;
        }

        var headerBytes = Encoding.ASCII.GetBytes($"Content-Length: {payloadBytes.Length}\r\n\r\n");
        await _writeLock.WaitAsync(cancellationToken);
        try
        {
            await _output.WriteAsync(headerBytes, cancellationToken);
            await _output.WriteAsync(payloadBytes, cancellationToken);
            await _output.FlushAsync(cancellationToken);
        }
        finally
        {
            _writeLock.Release();
        }
        return true;
    }

    public async Task<string?> ReadPayloadAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            var separatorIndex = FindSequence(_buffer.AsSpan(0, _bufferLength), HeaderSeparator);
            if (separatorIndex >= 0)
            {
                var header = Encoding.ASCII.GetString(_buffer, 0, separatorIndex);
                var contentLength = ParseContentLength(header);
                if (contentLength is null || contentLength < 0 || contentLength > MaxMessageBytes)
                {
                    return null;
                }

                var payloadStart = separatorIndex + HeaderSeparator.Length;
                var messageLength = payloadStart + contentLength.Value;
                if (_bufferLength >= messageLength)
                {
                    var payload = Encoding.UTF8.GetString(_buffer, payloadStart, contentLength.Value);
                    Consume(messageLength);
                    return payload;
                }
            }

            if (_bufferLength == _buffer.Length)
            {
                if (_buffer.Length >= MaxBufferBytes)
                {
                    return null;
                }
                Array.Resize(ref _buffer, Math.Min(_buffer.Length * 2, MaxBufferBytes));
            }

            var read = await _input.ReadAsync(
                _buffer.AsMemory(_bufferLength, _buffer.Length - _bufferLength),
                cancellationToken);
            if (read == 0)
            {
                return null;
            }
            _bufferLength += read;
        }
    }

    private static int FindSequence(ReadOnlySpan<byte> source, ReadOnlySpan<byte> sequence)
    {
        return source.IndexOf(sequence);
    }

    private static int? ParseContentLength(string header)
    {
        foreach (var line in header.Split("\r\n", StringSplitOptions.RemoveEmptyEntries))
        {
            const string prefix = "Content-Length:";
            if (line.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) &&
                int.TryParse(line[prefix.Length..].Trim(), out var value))
            {
                return value;
            }
        }
        return null;
    }

    private void Consume(int count)
    {
        var remaining = _bufferLength - count;
        if (remaining > 0)
        {
            Buffer.BlockCopy(_buffer, count, _buffer, 0, remaining);
        }
        _bufferLength = remaining;
    }
}
