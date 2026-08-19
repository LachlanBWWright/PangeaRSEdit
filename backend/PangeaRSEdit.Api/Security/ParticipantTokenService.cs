using System.Security.Cryptography;
using System.Text;
using System.Globalization;

namespace PangeaRSEdit.Api.Security;

public sealed class ParticipantTokenService(IConfiguration configuration)
{
    private readonly byte[] _signingKey = Encoding.UTF8.GetBytes(
        configuration["Multiplayer:ParticipantSigningKey"] ?? "local-development-participant-key");

    public string Create(string participantId)
    {
        var participantBytes = Encoding.UTF8.GetBytes(participantId);
        var signature = HMACSHA256.HashData(_signingKey, participantBytes);
        return $"{participantId}.{Convert.ToHexStringLower(signature)}";
    }

    public string? Validate(string token)
    {
        var separatorIndex = token.LastIndexOf('.');
        if (separatorIndex <= 0 || separatorIndex == token.Length - 1)
        {
            return null;
        }

        var participantId = token[..separatorIndex];
        var signatureText = token[(separatorIndex + 1)..];
        var signature = ParseHex(signatureText);
        if (signature is null)
        {
            return null;
        }
        var expectedSignature = HMACSHA256.HashData(
            _signingKey,
            Encoding.UTF8.GetBytes(participantId));

        return CryptographicOperations.FixedTimeEquals(signature, expectedSignature)
            ? participantId
            : null;
    }

    private static byte[]? ParseHex(string value)
    {
        if (value.Length != 64)
        {
            return null;
        }

        var bytes = new byte[32];
        for (var index = 0; index < bytes.Length; index += 1)
        {
            var pair = value.AsSpan(index * 2, 2);
            if (!byte.TryParse(pair, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out bytes[index]))
            {
                return null;
            }
        }

        return bytes;
    }
}
