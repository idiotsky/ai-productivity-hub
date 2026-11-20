using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AIProductivityHub.Api.Tests;

[TestFixture]
public class HostTests
{
    [TestCase("/")]
    [TestCase("/api")]
    [TestCase("/mcp")]
    public async Task UnmappedRoutesReturnNotFound(string path)
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(path);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(await response.Content.ReadAsStringAsync(), Is.Empty);
    }
}
