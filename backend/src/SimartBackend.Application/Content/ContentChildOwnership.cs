using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Content;

/// <summary>Shared by the watch-progress endpoints — both are keyed by childId,
/// so each needs the same "does this child belong to the caller's family" check
/// before touching anything. Same shape as HabitChildOwnership/
/// FocusChildOwnership/SocialChildOwnership/RewardChildOwnership, kept as its
/// own small copy for the same reason those are — see FocusChildOwnership's doc
/// comment.</summary>
internal static class ContentChildOwnership
{
    public static async Task EnsureCallerOwnsChildAsync(
        IFamilyAccountRepository familyAccountRepository, Guid callerFamilyId, Guid childId, CancellationToken cancellationToken)
    {
        var childFamilyId = await familyAccountRepository.GetFamilyIdForChildAsync(childId, cancellationToken);
        if (childFamilyId is null)
            throw new ContentChildNotFoundException(childId);
        if (childFamilyId != callerFamilyId)
            throw new ContentAccessDeniedException();
    }
}
