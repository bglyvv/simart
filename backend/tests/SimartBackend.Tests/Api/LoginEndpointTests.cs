using System.Net;
using System.Net.Http.Json;

namespace SimartBackend.Tests.Api;

public class LoginEndpointTests(SimartBackendApiFactory factory) : IClassFixture<SimartBackendApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Returns_200_with_a_token_for_correct_credentials()
    {
        var email = $"{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync(
            "/api/identity/signup",
            new SignupRequestBody("Parent", email, "correct-password", "1234"),
            JsonTestOptions.Web);

        var response = await _client.PostAsJsonAsync(
            "/api/identity/login",
            new LoginRequestBody(email, "correct-password"),
            JsonTestOptions.Web);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FamilyAccountResponse>(JsonTestOptions.Web);
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
    }

    [Fact]
    public async Task Returns_401_for_the_wrong_password()
    {
        var email = $"{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync(
            "/api/identity/signup",
            new SignupRequestBody("Parent", email, "correct-password", "1234"),
            JsonTestOptions.Web);

        var response = await _client.PostAsJsonAsync(
            "/api/identity/login",
            new LoginRequestBody(email, "wrong-password"),
            JsonTestOptions.Web);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_401_for_an_unregistered_email()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/identity/login",
            new LoginRequestBody($"{Guid.NewGuid()}@example.com", "whatever"),
            JsonTestOptions.Web);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_400_when_the_password_is_missing()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/identity/login",
            new LoginRequestBody("someone@example.com", ""),
            JsonTestOptions.Web);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
