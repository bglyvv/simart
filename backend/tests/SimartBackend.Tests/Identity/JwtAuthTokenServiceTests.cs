using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SimartBackend.Infrastructure.Identity;

namespace SimartBackend.Tests.Identity;

public class JwtAuthTokenServiceTests
{
    [Fact]
    public void IssueFamilyToken_embeds_familyId_parentId_and_email_as_claims()
    {
        var service = new JwtAuthTokenService(TestJwtConfiguration.WithDefaultSigningKey());
        var familyId = Guid.NewGuid();
        var parentId = Guid.NewGuid();

        var token = service.IssueFamilyToken(familyId, parentId, "parent@example.com");
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal(parentId.ToString(), jwt.Subject);
        Assert.Equal(familyId.ToString(), jwt.Claims.Single(c => c.Type == JwtAuthTokenService.FamilyIdClaimType).Value);
        Assert.Equal("parent@example.com", jwt.Claims.Single(c => c.Type == JwtRegisteredClaimNames.Email).Value);
    }

    [Fact]
    public void IssueFamilyToken_produces_a_token_that_validates_against_the_same_key()
    {
        // Mirrors exactly what Program.cs's AddJwtBearer does — this round-trip is
        // what actually matters, not just "a JWT-shaped string came out".
        var service = new JwtAuthTokenService(TestJwtConfiguration.WithDefaultSigningKey());
        var token = service.IssueFamilyToken(Guid.NewGuid(), Guid.NewGuid(), "parent@example.com");

        var handler = new JwtSecurityTokenHandler();
        var principal = handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "SimartBackend",
            ValidateAudience = true,
            ValidAudience = "SimartFrontend",
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtConfiguration.SigningKey)),
        }, out _);

        Assert.NotNull(principal.Identity);
    }

    [Fact]
    public void IssueFamilyToken_rejects_validation_against_a_different_key()
    {
        var service = new JwtAuthTokenService(TestJwtConfiguration.WithDefaultSigningKey());
        var token = service.IssueFamilyToken(Guid.NewGuid(), Guid.NewGuid(), "parent@example.com");

        var handler = new JwtSecurityTokenHandler();
        Assert.ThrowsAny<SecurityTokenException>(() => handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "SimartBackend",
            ValidateAudience = true,
            ValidAudience = "SimartFrontend",
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("a-completely-different-signing-key-0123456789")),
        }, out _));
    }

    [Fact]
    public void IssueFamilyToken_throws_a_clear_error_when_SigningKey_is_missing()
    {
        var service = new JwtAuthTokenService(TestJwtConfiguration.Empty());

        var ex = Assert.Throws<InvalidOperationException>(
            () => service.IssueFamilyToken(Guid.NewGuid(), Guid.NewGuid(), "x@example.com"));
        Assert.Contains("Jwt:SigningKey", ex.Message);
    }
}
