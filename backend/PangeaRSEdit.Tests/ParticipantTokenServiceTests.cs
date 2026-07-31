using Microsoft.Extensions.Configuration;
using PangeaRSEdit.Api.Security;

namespace PangeaRSEdit.Tests;

public sealed class ParticipantTokenServiceTests
{
    private static ParticipantTokenService CreateService()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Multiplayer:ParticipantSigningKey"] = "test-signing-key-with-sufficient-entropy"
            })
            .Build();

        return new ParticipantTokenService(configuration);
    }

    [Fact]
    public void Validate_ReturnsParticipantForAuthenticToken()
    {
        var service = CreateService();
        var token = service.Create("participant-1");

        Assert.Equal("participant-1", service.Validate(token));
    }

    [Fact]
    public void Validate_RejectsTamperedParticipant()
    {
        var service = CreateService();
        var token = service.Create("participant-1");
        var tamperedToken = token.Replace("participant-1", "participant-2", StringComparison.Ordinal);

        Assert.Null(service.Validate(tamperedToken));
    }

    [Theory]
    [InlineData("")]
    [InlineData("missing-signature")]
    [InlineData("participant.invalid-hex")]
    public void Validate_RejectsMalformedToken(string token)
    {
        var service = CreateService();

        Assert.Null(service.Validate(token));
    }
}
