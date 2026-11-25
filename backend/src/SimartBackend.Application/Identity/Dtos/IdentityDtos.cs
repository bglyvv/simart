using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Application.Identity.Dtos;

/// <summary>Returned by both signup (auto-login) and login — Token is the bearer
/// token to send as `Authorization: Bearer {Token}` on subsequent requests, e.g.
/// POST /api/identity/families/{familyId}/children.</summary>
public sealed record FamilyAccountDto(Guid FamilyId, Guid ParentId, string FullName, string Email, string Token);

public sealed record ChildDto(
    Guid ChildId,
    Guid FamilyId,
    string Name,
    string AvatarEmoji,
    string Gender,
    DateOnly DateOfBirth,
    string City,
    /// <summary>Whether a parent has set a PIN for this child (see
    /// Child.PinHash) — never the hash itself. Lets the frontend decide
    /// whether switching into this child needs a PIN prompt at all, without
    /// a separate round trip.</summary>
    bool HasPin = false);

/// <summary>Admin-only account directory row — GET /api/admin/families (DeactivatedAt
/// null there) and GET /api/admin/families/deactivated (always set there).
/// Deliberately never includes PasswordHash/PinHash; there's no reason for even an
/// admin view to carry those out of the database.</summary>
public sealed record FamilySummaryDto(
    Guid FamilyId,
    DateTimeOffset CreatedAt,
    IReadOnlyList<ParentSummaryDto> Parents,
    IReadOnlyList<ChildSummaryDto> Children,
    DateTimeOffset? DeactivatedAt = null)
{
    public static FamilySummaryDto FromDomain(Family family) => new(
        family.Id,
        family.CreatedAt,
        family.Parents.Select(ParentSummaryDto.FromDomain).ToList(),
        family.Children.Select(ChildSummaryDto.FromDomain).ToList(),
        family.IsDeleted ? family.DeletedAt : null);
}

public sealed record ParentSummaryDto(Guid ParentId, string FullName, string Email)
{
    public static ParentSummaryDto FromDomain(Parent parent) => new(parent.Id, parent.FullName, parent.Email);
}

public sealed record ChildSummaryDto(Guid ChildId, string Name, string Gender, DateOnly DateOfBirth, string City)
{
    public static ChildSummaryDto FromDomain(Child child) => new(
        child.Id, child.Name, child.Gender, child.DateOfBirth, child.City);
}
