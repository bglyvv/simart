using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Social;

/// <summary>Shared by every Social command keyed by an acting childId (create
/// post, like/unlike, comment) — same shape as HabitChildOwnership/
/// FocusChildOwnership/RewardChildOwnership, kept as its own small copy for
/// the same reason those are (see FocusChildOwnership's doc comment).</summary>
internal static class SocialChildOwnership
{
    public static async Task EnsureCallerOwnsChildAsync(
        IFamilyAccountRepository familyAccountRepository, Guid callerFamilyId, Guid childId, CancellationToken cancellationToken)
    {
        var childFamilyId = await familyAccountRepository.GetFamilyIdForChildAsync(childId, cancellationToken);
        if (childFamilyId is null)
            throw new SocialChildNotFoundException(childId);
        if (childFamilyId != callerFamilyId)
            throw new SocialAccessDeniedException();
    }
}
