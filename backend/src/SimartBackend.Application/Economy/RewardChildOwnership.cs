using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Economy;

/// <summary>Shared by GetRewards/RedeemReward — both are keyed by childId, so
/// each needs the same "does this child belong to the caller's family" check
/// before touching anything. Same shape as HabitChildOwnership/
/// FocusChildOwnership, kept as its own small copy for the same reason those
/// are — see FocusChildOwnership's doc comment.</summary>
internal static class RewardChildOwnership
{
    public static async Task EnsureCallerOwnsChildAsync(
        IFamilyAccountRepository familyAccountRepository, Guid callerFamilyId, Guid childId, CancellationToken cancellationToken)
    {
        var childFamilyId = await familyAccountRepository.GetFamilyIdForChildAsync(childId, cancellationToken);
        if (childFamilyId is null)
            throw new RewardChildNotFoundException(childId);
        if (childFamilyId != callerFamilyId)
            throw new RewardAccessDeniedException();
    }
}
