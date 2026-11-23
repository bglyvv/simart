using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Economy;

/// <summary>Shared by Donate/GrantAllowance/GetWalletBalance/GetWalletTransactions
/// — all keyed by childId (not familyId), so each needs the same "does this
/// child belong to the caller's family" check. A separate small copy from
/// RewardChildOwnership despite living in the same Economy namespace — each
/// sub-concept's ownership check throws its own exception types, which
/// Program.cs's endpoint-specific catch blocks map to responses.</summary>
internal static class WalletChildOwnership
{
    public static async Task EnsureCallerOwnsChildAsync(
        IFamilyAccountRepository familyAccountRepository, Guid callerFamilyId, Guid childId, CancellationToken cancellationToken)
    {
        var childFamilyId = await familyAccountRepository.GetFamilyIdForChildAsync(childId, cancellationToken);
        if (childFamilyId is null)
            throw new WalletChildNotFoundException(childId);
        if (childFamilyId != callerFamilyId)
            throw new WalletAccessDeniedException();
    }
}
