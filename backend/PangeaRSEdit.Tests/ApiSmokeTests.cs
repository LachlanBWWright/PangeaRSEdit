using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace PangeaRSEdit.Tests;

public sealed class ApiSmokeTests : IClassFixture<PangeaApiFactory>
{
    private readonly PangeaApiFactory _factory;

    public ApiSmokeTests(PangeaApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Healthz_ReturnsOk()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/healthz");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SavedLevels_WithoutSession_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/api/saved-levels");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
