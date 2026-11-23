using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Primitives;

namespace SimartBackend.Tests.Identity;

/// <summary>Minimal hand-rolled IConfiguration — JwtAuthTokenService only ever reads
/// the string indexer, so that's the only member actually implemented; the rest throw
/// if something starts calling them, which would mean this fake needs extending.</summary>
internal sealed class TestJwtConfiguration(Dictionary<string, string?> values) : IConfiguration
{
    public const string SigningKey = "unit-test-signing-key-at-least-256-bits-long-0123456789";

    public static IConfiguration WithDefaultSigningKey() =>
        new TestJwtConfiguration(new Dictionary<string, string?> { ["Jwt:SigningKey"] = SigningKey });

    /// <summary>For minting a token meant to validate against a specific host's key —
    /// e.g. SimartBackendApiFactory.JwtSigningKey in the Api integration tests.</summary>
    public static IConfiguration With(string signingKey) =>
        new TestJwtConfiguration(new Dictionary<string, string?> { ["Jwt:SigningKey"] = signingKey });

    public static IConfiguration Empty() => new TestJwtConfiguration([]);

    public string? this[string key]
    {
        get => values.GetValueOrDefault(key);
        set => values[key] = value;
    }

    public IEnumerable<IConfigurationSection> GetChildren() => throw new NotSupportedException();
    public IChangeToken GetReloadToken() => throw new NotSupportedException();
    public IConfigurationSection GetSection(string key) => throw new NotSupportedException();
}
