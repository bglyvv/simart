using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Tests.Identity;

/// <summary>In-memory stand-in for IFamilyAccountRepository — enough behavior to
/// exercise the real command handlers without a database. Deliberately mirrors
/// EfFamilyAccountRepository's exact-match comparisons (callers already normalize
/// email before calling in, same contract as the real implementation).</summary>
public sealed class InMemoryFamilyAccountRepository : IFamilyAccountRepository
{
    private readonly List<Family> _families = [];
    private readonly List<Parent> _parents = [];
    private readonly List<Child> _children = [];
    private readonly List<PasswordResetToken> _resetTokens = [];

    public IReadOnlyList<Child> Children => _children;

    /// <summary>Test-only convenience: creates a bare Family with no parents, for
    /// tests (like AddChildCommandHandler's) that only need an existing familyId
    /// and don't care about signup specifics.</summary>
    public Task<Guid> SeedFamilyAsync()
    {
        var family = new Family { Id = Guid.NewGuid(), CreatedAt = DateTimeOffset.UtcNow };
        _families.Add(family);
        return Task.FromResult(family.Id);
    }

    public Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken) =>
        Task.FromResult(_parents.Any(p => p.Email == email));

    public Task AddFamilyAsync(Family family, CancellationToken cancellationToken)
    {
        _families.Add(family);
        _parents.AddRange(family.Parents);
        return Task.CompletedTask;
    }

    public Task<bool> FamilyExistsAsync(Guid familyId, CancellationToken cancellationToken) =>
        Task.FromResult(_families.Any(f => f.Id == familyId));

    public Task AddChildAsync(Child child, CancellationToken cancellationToken)
    {
        _children.Add(child);
        return Task.CompletedTask;
    }

    public Task<Parent?> FindParentByEmailAsync(string email, CancellationToken cancellationToken) =>
        Task.FromResult(_parents.FirstOrDefault(p => p.Email == email));

    public Task<IReadOnlyList<Family>> GetAllFamiliesWithMembersAsync(CancellationToken cancellationToken)
    {
        // AddChildAsync only ever sets Child.FamilyId (same as the real EF repository —
        // no code anywhere touches Family.Children directly), so mirror what EF's
        // Include(f => f.Children) would actually do: join by that FK at read time.
        foreach (var family in _families)
        {
            family.Children.Clear();
            foreach (var child in _children.Where(c => c.FamilyId == family.Id))
                family.Children.Add(child);
        }
        return Task.FromResult((IReadOnlyList<Family>)_families.OrderByDescending(f => f.CreatedAt).ToList());
    }

    public Task<IReadOnlyList<Child>> GetChildrenAsync(Guid familyId, CancellationToken cancellationToken) =>
        Task.FromResult((IReadOnlyList<Child>)_children.Where(c => c.FamilyId == familyId).ToList());

    public Task<Guid?> GetFamilyIdForChildAsync(Guid childId, CancellationToken cancellationToken) =>
        Task.FromResult(_children.FirstOrDefault(c => c.Id == childId)?.FamilyId);

    public Task<IReadOnlyList<Child>> GetChildrenByIdsAsync(IReadOnlyList<Guid> childIds, CancellationToken cancellationToken) =>
        Task.FromResult((IReadOnlyList<Child>)_children.Where(c => childIds.Contains(c.Id)).ToList());

    public Task AddPasswordResetTokenAsync(PasswordResetToken token, CancellationToken cancellationToken)
    {
        _resetTokens.Add(token);
        return Task.CompletedTask;
    }

    public Task<PasswordResetToken?> FindPasswordResetTokenByHashAsync(string tokenHash, CancellationToken cancellationToken) =>
        Task.FromResult(_resetTokens.FirstOrDefault(t => t.TokenHash == tokenHash));

    public Task ResetPasswordAsync(PasswordResetToken token, string newPasswordHash, CancellationToken cancellationToken)
    {
        var parent = _parents.FirstOrDefault(p => p.Id == token.ParentId);
        if (parent is not null)
            parent.PasswordHash = newPasswordHash;
        token.UsedAt = DateTimeOffset.UtcNow;
        return Task.CompletedTask;
    }

    public Task<bool> DeactivateFamilyAsync(Guid familyId, Guid deactivatedByAdminId, CancellationToken cancellationToken)
    {
        var family = _families.FirstOrDefault(f => f.Id == familyId && !f.IsDeleted);
        if (family is null)
            return Task.FromResult(false);

        var deletedAt = DateTimeOffset.UtcNow;
        family.IsDeleted = true;
        family.DeletedAt = deletedAt;
        family.DeletedBy = deactivatedByAdminId;

        foreach (var parent in _parents.Where(p => p.FamilyId == familyId))
        {
            parent.IsDeleted = true;
            parent.DeletedAt = deletedAt;
            parent.DeletedBy = deactivatedByAdminId;
        }
        foreach (var child in _children.Where(c => c.FamilyId == familyId))
        {
            child.IsDeleted = true;
            child.DeletedAt = deletedAt;
            child.DeletedBy = deactivatedByAdminId;
        }
        return Task.FromResult(true);
    }

    public Task<bool> ReactivateFamilyAsync(Guid familyId, CancellationToken cancellationToken)
    {
        var family = _families.FirstOrDefault(f => f.Id == familyId && f.IsDeleted);
        if (family is null)
            return Task.FromResult(false);

        var cascadedDeletedAt = family.DeletedAt;
        var cascadedDeletedBy = family.DeletedBy;
        family.IsDeleted = false;
        family.DeletedAt = null;
        family.DeletedBy = null;

        foreach (var parent in _parents.Where(p =>
            p.FamilyId == familyId && p.IsDeleted && p.DeletedAt == cascadedDeletedAt && p.DeletedBy == cascadedDeletedBy))
        {
            parent.IsDeleted = false;
            parent.DeletedAt = null;
            parent.DeletedBy = null;
        }
        foreach (var child in _children.Where(c =>
            c.FamilyId == familyId && c.IsDeleted && c.DeletedAt == cascadedDeletedAt && c.DeletedBy == cascadedDeletedBy))
        {
            child.IsDeleted = false;
            child.DeletedAt = null;
            child.DeletedBy = null;
        }
        return Task.FromResult(true);
    }

    public Task<IReadOnlyList<Family>> GetDeactivatedFamiliesWithMembersAsync(CancellationToken cancellationToken)
    {
        var deactivated = _families.Where(f => f.IsDeleted).OrderByDescending(f => f.DeletedAt).ToList();
        foreach (var family in deactivated)
        {
            family.Parents.Clear();
            foreach (var parent in _parents.Where(p => p.FamilyId == family.Id))
                family.Parents.Add(parent);
            family.Children.Clear();
            foreach (var child in _children.Where(c => c.FamilyId == family.Id))
                family.Children.Add(child);
        }
        return Task.FromResult((IReadOnlyList<Family>)deactivated);
    }

    public Task<bool> UpdateParentNameAsync(Guid parentId, string fullName, CancellationToken cancellationToken)
    {
        var parent = _parents.FirstOrDefault(p => p.Id == parentId && !p.IsDeleted);
        if (parent is null)
            return Task.FromResult(false);

        parent.FullName = fullName;
        return Task.FromResult(true);
    }

    public Task<bool> UpdateChildInfoAsync(Guid childId, string name, string city, CancellationToken cancellationToken)
    {
        var child = _children.FirstOrDefault(c => c.Id == childId && !c.IsDeleted);
        if (child is null)
            return Task.FromResult(false);

        child.Name = name;
        child.City = city;
        return Task.FromResult(true);
    }
}
