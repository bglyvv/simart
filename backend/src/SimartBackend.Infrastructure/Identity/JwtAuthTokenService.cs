using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Infrastructure.Identity;

/// <summary>Issues signed JWTs for the Identity, Admin, and Partner endpoints. A single
/// symmetric signing key is enough here — one backend issues the tokens and that same
/// backend is the only one that ever validates them (Api/Program.cs's AddJwtBearer),
/// so there's no need for asymmetric (public/private key) signing. Family tokens carry
/// familyId/parentId; admin tokens carry adminId; partner tokens carry partnerId —
/// deliberately disjoint claim types so one account type's token can never satisfy
/// another's endpoint just by both being valid, signed JWTs.</summary>
public sealed class JwtAuthTokenService(IConfiguration configuration) : IAuthTokenService
{
    public const string FamilyIdClaimType = "familyId";
    public const string AdminIdClaimType = "adminId";
    public const string PartnerIdClaimType = "partnerId";

    public string IssueFamilyToken(Guid familyId, Guid parentId, string email) => BuildToken(
        subject: parentId,
        email: email,
        [new Claim(FamilyIdClaimType, familyId.ToString())]);

    public string IssueAdminToken(Guid adminId, string email) => BuildToken(
        subject: adminId,
        email: email,
        [new Claim(AdminIdClaimType, adminId.ToString())]);

    public string IssuePartnerToken(Guid partnerId, string email) => BuildToken(
        subject: partnerId,
        email: email,
        [new Claim(PartnerIdClaimType, partnerId.ToString())]);

    private string BuildToken(Guid subject, string email, IEnumerable<Claim> extraClaims)
    {
        var signingKey = configuration["Jwt:SigningKey"]
            ?? throw new InvalidOperationException(
                "Missing Jwt:SigningKey — set it via `dotnet user-secrets` for local dev " +
                "(see backend/README.md) or the JWT__SIGNINGKEY env var in other environments.");
        var issuer = configuration["Jwt:Issuer"] ?? "SimartBackend";
        var audience = configuration["Jwt:Audience"] ?? "SimartFrontend";

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, subject.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
        }.Concat(extraClaims);

        // 7 days — this app has no refresh-token flow yet, so the token itself has to
        // last a reasonable "stay signed in" window rather than a short API-session one.
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
