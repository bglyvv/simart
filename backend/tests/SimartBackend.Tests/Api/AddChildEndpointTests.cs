using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SimartBackend.Infrastructure.Identity;
using SimartBackend.Tests.Identity;

namespace SimartBackend.Tests.Api;

/// <summary>The family-ownership check this is really here for lives directly in
/// Program.cs's endpoint lambda (`user.FindFirstValue(...) != familyId.ToString()`),
/// not in any command handler — so it had zero automated coverage until these tests,
/// despite being the single most safety-critical check in the backend.</summary>
public class AddChildEndpointTests(SimartBackendApiFactory factory) : IClassFixture<SimartBackendApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private async Task<FamilyAccountResponse> SignUpAsync()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/identity/signup",
            new SignupRequestBody("Test Parent", $"{Guid.NewGuid()}@example.com", "secret123", "1234"),
            JsonTestOptions.Web);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<FamilyAccountResponse>(JsonTestOptions.Web))!;
    }

    private static HttpRequestMessage BuildRequest(Guid familyId, AddChildRequestBody body, string? bearerToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/identity/families/{familyId}/children")
        {
            Content = JsonContent.Create(body, options: JsonTestOptions.Web),
        };
        if (bearerToken is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        return request;
    }

    [Fact]
    public async Task Returns_201_when_the_tokens_family_matches_the_route()
    {
        var account = await SignUpAsync();
        var request = BuildRequest(
            account.FamilyId,
            new AddChildRequestBody("Aysel", "🦄", "girl", new DateOnly(2019, 7, 15), "Baku"),
            account.Token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var child = await response.Content.ReadFromJsonAsync<ChildResponse>(JsonTestOptions.Web);
        Assert.Equal(account.FamilyId, child!.FamilyId);
        Assert.Equal("Aysel", child.Name);
    }

    [Fact]
    public async Task Returns_401_with_no_token_at_all()
    {
        var account = await SignUpAsync();
        var request = BuildRequest(
            account.FamilyId,
            new AddChildRequestBody("NoAuth", "🦄", "girl", new DateOnly(2019, 7, 15), "Baku"),
            bearerToken: null);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_403_when_the_tokens_family_does_not_match_the_route()
    {
        var accountA = await SignUpAsync();
        var accountB = await SignUpAsync();

        // accountA's token, writing into accountB's family — must be rejected, not
        // silently allowed just because the token is otherwise valid.
        var request = BuildRequest(
            accountB.FamilyId,
            new AddChildRequestBody("WrongFamily", "🦄", "boy", new DateOnly(2020, 1, 1), "Baku"),
            accountA.Token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Returns_404_when_the_token_is_valid_but_the_family_was_never_created()
    {
        // Not reachable through the real signup flow (signup always creates the family
        // it then issues a token for) — simulated here by minting a token directly,
        // signed with the same key the test host validates against, for a familyId
        // that was never persisted. Covers AddChildCommandHandler's
        // FamilyNotFoundException -> 404 mapping at the actual HTTP layer.
        var ghostFamilyId = Guid.NewGuid();
        var tokenService = new JwtAuthTokenService(TestJwtConfiguration.With(SimartBackendApiFactory.JwtSigningKey));
        var token = tokenService.IssueFamilyToken(ghostFamilyId, Guid.NewGuid(), "ghost@example.com");

        var request = BuildRequest(
            ghostFamilyId,
            new AddChildRequestBody("Ghost", "🦄", "boy", new DateOnly(2020, 1, 1), "Baku"),
            token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Returns_400_for_an_invalid_gender_even_with_a_valid_token()
    {
        var account = await SignUpAsync();
        var request = BuildRequest(
            account.FamilyId,
            new AddChildRequestBody("BadGender", "🦄", "other", new DateOnly(2020, 1, 1), "Baku"),
            account.Token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
