using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where family/parent/child accounts are written and looked up. Implemented
/// in Infrastructure against SimartDbContext — Application only ever sees this
/// interface, same pattern as IContentCatalogRepository.</summary>
public interface IFamilyAccountRepository
{
    /// <summary>Case-insensitive — callers should pass an already-normalized
    /// (trimmed, lowercased) email.</summary>
    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken);

    /// <summary>Persists a Family together with its Parents collection (EF cascades
    /// the navigation) in one save.</summary>
    Task AddFamilyAsync(Family family, CancellationToken cancellationToken);

    Task<bool> FamilyExistsAsync(Guid familyId, CancellationToken cancellationToken);

    Task AddChildAsync(Child child, CancellationToken cancellationToken);

    /// <summary>Case-insensitive, same contract as EmailExistsAsync — pass an
    /// already-normalized email. Used by LoginFamilyCommandHandler to find the
    /// PasswordHash to verify against.</summary>
    Task<Parent?> FindParentByEmailAsync(string email, CancellationToken cancellationToken);

    /// <summary>By the parent's own id — used by VerifyPinQuery/ChangePinCommand,
    /// both keyed by the caller's own JWT subject (their own parentId), not by
    /// email or familyId.</summary>
    Task<Parent?> FindParentByIdAsync(Guid parentId, CancellationToken cancellationToken);

    /// <summary>Every family with its Parents and Children loaded — admin account
    /// directory only (GetFamiliesQuery), never used by any family-facing read path.</summary>
    Task<IReadOnlyList<Family>> GetAllFamiliesWithMembersAsync(CancellationToken cancellationToken);

    /// <summary>A single family's children — backs the family-facing
    /// GET /api/identity/families/{familyId}/children (GetChildrenQuery), used by the
    /// frontend's LoginPage to restore which child profile(s) belong to a returning
    /// parent on a device that doesn't already have one cached locally.</summary>
    Task<IReadOnlyList<Child>> GetChildrenAsync(Guid familyId, CancellationToken cancellationToken);

    /// <summary>Null if childId doesn't exist. Used by the Habits slice's
    /// HabitChildOwnership check — those endpoints are keyed by childId, not
    /// familyId, so they need to resolve which family a child belongs to before
    /// comparing it against the caller's token.</summary>
    Task<Guid?> GetFamilyIdForChildAsync(Guid childId, CancellationToken cancellationToken);

    /// <summary>Children by id, across any family — unlike GetChildrenAsync
    /// (one family at a time), this is for the rare cross-family read:
    /// GetLeaderboardQuery resolves AvatarEmoji for whichever children rank
    /// highest, regardless of which family each belongs to.</summary>
    Task<IReadOnlyList<Child>> GetChildrenByIdsAsync(IReadOnlyList<Guid> childIds, CancellationToken cancellationToken);

    /// <summary>Appends one row to the password-reset ledger — ForgotPasswordCommand's
    /// write, once it's confirmed a real parent owns the given email.</summary>
    Task AddPasswordResetTokenAsync(PasswordResetToken token, CancellationToken cancellationToken);

    /// <summary>Looks a reset attempt up by the hash of the raw token the user
    /// presented — never by the raw token itself, since only the hash is ever
    /// stored. Doesn't filter by expiry/used — ResetPasswordCommandHandler checks
    /// both explicitly so it can report a clear "invalid or expired" either way.</summary>
    Task<PasswordResetToken?> FindPasswordResetTokenByHashAsync(string tokenHash, CancellationToken cancellationToken);

    /// <summary>Sets the parent's new PasswordHash and marks the token used, in one
    /// save — atomic, so a token can't end up consumed without the password
    /// actually changing, or vice versa.</summary>
    Task ResetPasswordAsync(PasswordResetToken token, string newPasswordHash, CancellationToken cancellationToken);

    /// <summary>Soft-deletes a family together with every one of its Parents and
    /// Children, all stamped with the same DeletedAt/DeletedBy pair — the admin
    /// "deactivate account" action. False if familyId doesn't exist (or is already
    /// deactivated — the active-only lookup this uses won't find it either way).
    /// Same cascade shape as IContentCatalogRepository.SoftDeletePlaylistAsync.</summary>
    Task<bool> DeactivateFamilyAsync(Guid familyId, Guid deactivatedByAdminId, CancellationToken cancellationToken);

    /// <summary>Undoes DeactivateFamilyAsync — restores the family and only the
    /// Parents/Children cascade-deactivated alongside it (matched by the same
    /// DeletedAt/DeletedBy stamp), same "don't resurrect something deleted
    /// separately" care as RestorePlaylistAsync. False if familyId doesn't exist
    /// or isn't currently deactivated.</summary>
    Task<bool> ReactivateFamilyAsync(Guid familyId, CancellationToken cancellationToken);

    /// <summary>Every deactivated family, with its (also deactivated) Parents and
    /// Children loaded — GetDeactivatedFamiliesQuery, the admin-only "Deaktiv
    /// edilmiş" tab. Bypasses the global soft-delete filter deliberately, same as
    /// IContentCatalogRepository.GetDeletedPlaylistsAsync.</summary>
    Task<IReadOnlyList<Family>> GetDeactivatedFamiliesWithMembersAsync(CancellationToken cancellationToken);

    /// <summary>Admin-only edit — a parent's display name only (never email or
    /// password, both security-sensitive and out of scope here). False if
    /// parentId doesn't exist or is currently deactivated.</summary>
    Task<bool> UpdateParentNameAsync(Guid parentId, string fullName, CancellationToken cancellationToken);

    /// <summary>Admin-only edit — a child's name and city. False if childId
    /// doesn't exist or is currently deactivated.</summary>
    Task<bool> UpdateChildInfoAsync(Guid childId, string name, string city, CancellationToken cancellationToken);

    /// <summary>ChangePinCommandHandler's write, after it's already verified the
    /// caller's current PIN — sets the new hash only, same shape as
    /// UpdateParentNameAsync. False if parentId doesn't exist.</summary>
    Task<bool> ChangeParentPinAsync(Guid parentId, string newPinHash, CancellationToken cancellationToken);

    /// <summary>By the child's own id — VerifyChildPinQuery's read, needs the
    /// actual PinHash (null if none set) to compare against.</summary>
    Task<Child?> FindChildAsync(Guid childId, CancellationToken cancellationToken);

    /// <summary>SetChildPinCommand's write — either a parent setting (or,
    /// with newPinHash null, clearing) a child's PIN, or a child changing
    /// their own. Never checks a prior value first (unlike
    /// ChangeParentPinAsync) — see Child.PinHash's own doc comment for why.
    /// False if childId doesn't exist.</summary>
    Task<bool> SetChildPinAsync(Guid childId, string? newPinHash, CancellationToken cancellationToken);

    /// <summary>RequestChildProfileChangeCommand's write.</summary>
    Task AddProfileChangeRequestAsync(ChildProfileChangeRequest request, CancellationToken cancellationToken);

    /// <summary>The one still-pending request for a child, if any — used both
    /// to stop a child from queuing a second request while one is already
    /// outstanding, and by the child's own Settings view to show its
    /// status.</summary>
    Task<ChildProfileChangeRequest?> FindPendingProfileChangeRequestForChildAsync(
        Guid childId, CancellationToken cancellationToken);

    /// <summary>Every pending request across the given children, each with
    /// Child loaded (ApproveProfileChangeRequestCommandHandler/the parent's
    /// own Settings view both need the child's current name to show
    /// alongside the proposed one) — same two-step shape (resolve a family's
    /// childIds first, then query by them) GetPendingRedemptionsQueryHandler
    /// already uses.</summary>
    Task<IReadOnlyList<ChildProfileChangeRequest>> GetPendingProfileChangeRequestsForChildrenAsync(
        IReadOnlyList<Guid> childIds, CancellationToken cancellationToken);

    /// <summary>By its own id, with Child loaded — Approve/
    /// RejectProfileChangeRequestCommandHandler's ownership check needs the
    /// request's ChildId resolved to a family before anything else.</summary>
    Task<ChildProfileChangeRequest?> FindProfileChangeRequestAsync(Guid requestId, CancellationToken cancellationToken);

    /// <summary>Applies NewName/NewAvatarEmoji onto the real Child row and
    /// marks the request approved, in one save — a redemption-approval-style
    /// atomic pair, so a request can't end up "approved" without the child's
    /// identity actually changing, or vice versa. False if requestId doesn't
    /// exist.</summary>
    Task<bool> ApproveProfileChangeRequestAsync(Guid requestId, CancellationToken cancellationToken);

    /// <summary>Marks the request rejected — the child's row is never
    /// touched. False if requestId doesn't exist.</summary>
    Task<bool> RejectProfileChangeRequestAsync(Guid requestId, CancellationToken cancellationToken);
}
