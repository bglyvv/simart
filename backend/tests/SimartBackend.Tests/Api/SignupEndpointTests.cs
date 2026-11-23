using System.Net;
using System.Net.Http.Json;

namespace SimartBackend.Tests.Api;

public class SignupEndpointTests(SimartBackendApiFactory factory) : IClassFixture<SimartBackendApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Returns_201_with_a_usable_token_on_success()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/identity/signup",
            new SignupRequestBody("Test Parent", $"{Guid.NewGuid()}@example.com", "secret123", "1234"),
            JsonTestOptions.Web);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FamilyAccountResponse>(JsonTestOptions.Web);
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
    }

    [Fact]
    public async Task Returns_400_when_the_password_is_too_short()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/identity/signup",
            new SignupRequestBody("Test Parent", $"{Guid.NewGuid()}@example.com", "123", "1234"),
            JsonTestOptions.Web);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Returns_400_when_the_pin_is_not_four_digits()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/identity/signup",
            new SignupRequestBody("Test Parent", $"{Guid.NewGuid()}@example.com", "secret123", "12"),
            JsonTestOptions.Web);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Returns_409_for_a_duplicate_email()
    {
        var email = $"{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync(
            "/api/identity/signup",
            new SignupRequestBody("First", email, "secret123", "1234"),
            JsonTestOptions.Web);

        var second = await _client.PostAsJsonAsync(
            "/api/identity/signup",
            new SignupRequestBody("Second", email, "secret123", "5678"),
            JsonTestOptions.Web);

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }
}
