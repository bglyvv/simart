namespace SimartBackend.Application.Abstractions;

/// <summary>Issues the bearer token returned by signup/login. Implemented in
/// Infrastructure as a signed JWT — Application only ever sees this interface, same
/// pattern as IPasswordHasher.</summary>
public interface IAuthTokenService
{
    string IssueFamilyToken(Guid familyId, Guid parentId, string email);

    /// <summary>Carries an admin-scoped claim (no familyId) so a parent's token can
    /// never satisfy an admin-only endpoint and vice versa — see
    /// JwtAuthTokenService.AdminIdClaimType.</summary>
    string IssueAdminToken(Guid adminId, string email);

    /// <summary>Carries a partner-scoped claim — disjoint from both familyId and
    /// adminId, same "can't satisfy a different account type's endpoint" posture.
    /// See JwtAuthTokenService.PartnerIdClaimType.</summary>
    string IssuePartnerToken(Guid partnerId, string email);
}
