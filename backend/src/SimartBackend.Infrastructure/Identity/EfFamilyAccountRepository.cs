using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Identity;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Identity;

public sealed class EfFamilyAccountRepository(SimartDbContext db) : IFamilyAccountRepository
{
    public Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken) =>
        db.Parents.AnyAsync(p => p.Email == email, cancellationToken);

    public async Task AddFamilyAsync(Family family, CancellationToken cancellationToken)
    {
        db.Families.Add(family);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> FamilyExistsAsync(Guid familyId, CancellationToken cancellationToken) =>
        db.Families.AnyAsync(f => f.Id == familyId, cancellationToken);

    public async Task AddChildAsync(Child child, CancellationToken cancellationToken)
    {
        db.Children.Add(child);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<Parent?> FindParentByEmailAsync(string email, CancellationToken cancellationToken) =>
        db.Parents.FirstOrDefaultAsync(p => p.Email == email, cancellationToken);

    public Task<Parent?> FindParentByIdAsync(Guid parentId, CancellationToken cancellationToken) =>
        db.Parents.FirstOrDefaultAsync(p => p.Id == parentId, cancellationToken);

    public async Task<IReadOnlyList<Family>> GetAllFamiliesWithMembersAsync(CancellationToken cancellationToken) =>
        await db.Families
            .Include(f => f.Parents)
            .Include(f => f.Children)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Child>> GetChildrenAsync(Guid familyId, CancellationToken cancellationToken) =>
        await db.Children.Where(c => c.FamilyId == familyId).ToListAsync(cancellationToken);

    public Task<Guid?> GetFamilyIdForChildAsync(Guid childId, CancellationToken cancellationToken) =>
        db.Children.Where(c => c.Id == childId).Select(c => (Guid?)c.FamilyId).FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<Child>> GetChildrenByIdsAsync(
        IReadOnlyList<Guid> childIds, CancellationToken cancellationToken) =>
        await db.Children.Where(c => childIds.Contains(c.Id)).ToListAsync(cancellationToken);

    public async Task AddPasswordResetTokenAsync(PasswordResetToken token, CancellationToken cancellationToken)
    {
        db.PasswordResetTokens.Add(token);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<PasswordResetToken?> FindPasswordResetTokenByHashAsync(string tokenHash, CancellationToken cancellationToken) =>
        db.PasswordResetTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    public async Task ResetPasswordAsync(PasswordResetToken token, string newPasswordHash, CancellationToken cancellationToken)
    {
        var parent = await db.Parents.FirstOrDefaultAsync(p => p.Id == token.ParentId, cancellationToken);
        if (parent is null)
            return;

        parent.PasswordHash = newPasswordHash;
        token.UsedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeactivateFamilyAsync(Guid familyId, Guid deactivatedByAdminId, CancellationToken cancellationToken)
    {
        var family = await db.Families.FirstOrDefaultAsync(f => f.Id == familyId, cancellationToken);
        if (family is null)
            return false;

        // One stamp for the whole cascade — ReactivateFamilyAsync uses the exact
        // same pair to tell "deactivated alongside this family" apart from
        // anything deactivated separately, same reasoning as
        // EfContentCatalogRepository.SoftDeletePlaylistAsync.
        var deletedAt = DateTimeOffset.UtcNow;
        family.IsDeleted = true;
        family.DeletedAt = deletedAt;
        family.DeletedBy = deactivatedByAdminId;

        var parents = await db.Parents.Where(p => p.FamilyId == familyId).ToListAsync(cancellationToken);
        foreach (var parent in parents)
        {
            parent.IsDeleted = true;
            parent.DeletedAt = deletedAt;
            parent.DeletedBy = deactivatedByAdminId;
        }

        var children = await db.Children.Where(c => c.FamilyId == familyId).ToListAsync(cancellationToken);
        foreach (var child in children)
        {
            child.IsDeleted = true;
            child.DeletedAt = deletedAt;
            child.DeletedBy = deactivatedByAdminId;
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ReactivateFamilyAsync(Guid familyId, CancellationToken cancellationToken)
    {
        var family = await db.Families
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(f => f.Id == familyId && f.IsDeleted, cancellationToken);
        if (family is null)
            return false;

        var cascadedDeletedAt = family.DeletedAt;
        var cascadedDeletedBy = family.DeletedBy;

        family.IsDeleted = false;
        family.DeletedAt = null;
        family.DeletedBy = null;

        var cascadedParents = await db.Parents
            .IgnoreQueryFilters()
            .Where(p => p.FamilyId == familyId && p.IsDeleted
                && p.DeletedAt == cascadedDeletedAt && p.DeletedBy == cascadedDeletedBy)
            .ToListAsync(cancellationToken);
        foreach (var parent in cascadedParents)
        {
            parent.IsDeleted = false;
            parent.DeletedAt = null;
            parent.DeletedBy = null;
        }

        var cascadedChildren = await db.Children
            .IgnoreQueryFilters()
            .Where(c => c.FamilyId == familyId && c.IsDeleted
                && c.DeletedAt == cascadedDeletedAt && c.DeletedBy == cascadedDeletedBy)
            .ToListAsync(cancellationToken);
        foreach (var child in cascadedChildren)
        {
            child.IsDeleted = false;
            child.DeletedAt = null;
            child.DeletedBy = null;
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<Family>> GetDeactivatedFamiliesWithMembersAsync(CancellationToken cancellationToken)
    {
        var families = await db.Families
            .IgnoreQueryFilters()
            .Where(f => f.IsDeleted)
            .OrderByDescending(f => f.DeletedAt)
            .ToListAsync(cancellationToken);

        // Same manual join FamilySummaryDto.FromDomain expects via f.Parents/
        // f.Children navigations — a plain .Include() here would, per EF's own
        // IgnoreQueryFilters behavior, also silently suppress the filter on
        // every *other* still-active Parent/Child in the database (the exact
        // gotcha GetDeletedPlaylistsAsync's own subquery already hit), not just
        // this family's. Loading each family's own cascaded members by FamilyId
        // explicitly avoids that.
        foreach (var family in families)
        {
            family.Parents = await db.Parents
                .IgnoreQueryFilters()
                .Where(p => p.FamilyId == family.Id)
                .ToListAsync(cancellationToken);
            family.Children = await db.Children
                .IgnoreQueryFilters()
                .Where(c => c.FamilyId == family.Id)
                .ToListAsync(cancellationToken);
        }

        return families;
    }

    public async Task<bool> UpdateParentNameAsync(Guid parentId, string fullName, CancellationToken cancellationToken)
    {
        var parent = await db.Parents.FirstOrDefaultAsync(p => p.Id == parentId, cancellationToken);
        if (parent is null)
            return false;

        parent.FullName = fullName;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpdateChildInfoAsync(Guid childId, string name, string city, CancellationToken cancellationToken)
    {
        var child = await db.Children.FirstOrDefaultAsync(c => c.Id == childId, cancellationToken);
        if (child is null)
            return false;

        child.Name = name;
        child.City = city;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ChangeParentPinAsync(Guid parentId, string newPinHash, CancellationToken cancellationToken)
    {
        var parent = await db.Parents.FirstOrDefaultAsync(p => p.Id == parentId, cancellationToken);
        if (parent is null)
            return false;

        parent.PinHash = newPinHash;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
